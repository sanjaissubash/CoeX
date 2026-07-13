import json
import xml.etree.ElementTree as ET
import zipfile
import re
import os

class InfraParserService:
    @staticmethod
    def parse_file(file_path, original_filename, cloud_provider="AWS"):
        """
        Parses the uploaded infrastructure file and returns two dictionary mappings:
        - architecture: Title and markdown content for the Architecture Overview block
        - improvements: Title and markdown content for the Security & Architectural Improvements block
        """
        ext = os.path.splitext(original_filename.lower())[1]
        
        # 1. Terraform State Files
        if ext in [".tfstate", ".json"]:
            return InfraParserService._parse_terraform(file_path, cloud_provider)
            
        # 2. Draw.io Diagrams (XML)
        elif ext == ".drawio" or (ext == ".xml" and InfraParserService._is_drawio_xml(file_path)):
            return InfraParserService._parse_drawio(file_path, cloud_provider)
            
        # 3. Visio Diagrams (vsdx)
        elif ext == ".vsdx":
            return InfraParserService._parse_vsdx(file_path, cloud_provider)
            
        # 4. Standard Images (png, jpg, jpeg)
        elif ext in [".png", ".jpg", ".jpeg"]:
            return InfraParserService._parse_image(original_filename, cloud_provider)
            
        # 5. Fallback for general text configurations
        else:
            return InfraParserService._parse_general_config(file_path, original_filename, cloud_provider)

    @staticmethod
    def _is_drawio_xml(file_path):
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                header = f.read(1000)
                return "<mxfile" in header or "mxGraphModel" in header
        except:
            return False

    @staticmethod
    def _parse_terraform(file_path, cloud_provider):
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                state = json.load(f)
                
            resources = state.get("resources", [])
            if not resources:
                return {
                    "architecture": {
                        "title": "Terraform Infrastructure State",
                        "content": "### ℹ️ Empty Terraform State\nThe uploaded Terraform state file contains no active resource configuration blocks."
                    },
                    "improvements": {
                        "title": "Security & Infra Recommendations",
                        "content": "### ✅ No Recommendations\nUnable to audit security because no resources were found in the state file."
                    }
                }

            # Extract resources
            resource_list = []
            warnings = []
            s3_count = 0
            has_unencrypted_s3 = False
            security_groups = []

            for res in resources:
                rtype = res.get("type", "")
                rname = res.get("name", "")
                mode = res.get("mode", "")
                instances = res.get("instances", [])
                count = len(instances)
                
                if mode == "managed":
                    resource_list.append(f"- **{rname}** (`{rtype}`) — {count} active component(s)")
                
                # Check for S3 buckets
                if "s3_bucket" in rtype:
                    s3_count += 1
                    # Inspect S3 attributes
                    for inst in instances:
                        attrs = inst.get("attributes", {})
                        server_side_encryption = attrs.get("server_side_encryption_configuration", [])
                        if not server_side_encryption:
                            has_unencrypted_s3 = True

                # Check for security groups / rules
                if "security_group" in rtype:
                    for inst in instances:
                        attrs = inst.get("attributes", {})
                        sg_name = attrs.get("name", rname)
                        ingress = attrs.get("ingress", [])
                        security_groups.append((sg_name, ingress))

            # Audit security group ingress rules
            for sg_name, rules in security_groups:
                for rule in rules:
                    cidr_blocks = rule.get("cidr_blocks", [])
                    from_port = rule.get("from_port", -1)
                    to_port = rule.get("to_port", -1)
                    
                    if "0.0.0.0/0" in cidr_blocks:
                        if from_port in [22, 3389, 0, -1] or (from_port <= 22 <= to_port):
                            warnings.append(
                                f"⚠️ **Critical Ingress Exposure**: Security Group `{sg_name}` permits inbound traffic from **anywhere (0.0.0.0/0)** on management port(s) `{from_port}-{to_port}`."
                            )

            # Build Architecture Overview Markdown
            arch_content = f"### 🏗️ Terraform Infrastructure Overview\n"
            arch_content += f"Parsed from uploaded state file for **{cloud_provider}**.\n\n"
            arch_content += f"#### Active Managed Resources ({len(resource_list)}):\n"
            arch_content += "\n".join(resource_list) + "\n"

            # Build Improvements Markdown
            imp_content = f"### 🛡️ Security Audit & Improvements\n"
            if warnings:
                imp_content += "#### 🚨 High Priority Vulnerabilities:\n"
                imp_content += "\n".join(warnings) + "\n\n"
            else:
                imp_content += "#### ✅ Security Groups Check: Passed\nNo open management ports (like SSH port 22) exposed to the public Internet (`0.0.0.0/0`) detected.\n\n"

            imp_content += "#### 💡 Recommended Hygiene Upgrades:\n"
            if s3_count > 0:
                if has_unencrypted_s3:
                    imp_content += "- 🔒 **S3 Encryption**: Enable server-side encryption by default on S3 bucket resources to secure sensitive data-at-rest.\n"
                imp_content += "- 🔄 **S3 Versioning**: Enable versioning on S3 buckets to prevent accidental deletion and preserve deployment rollback states.\n"
            
            imp_content += f"- 🔑 **Least Privilege Policies**: Review IAM roles and ensure access is scoped explicitly rather than using wildcard administrative credentials.\n"
            imp_content += f"- 📊 **Logs & Monitoring**: Configure CloudTrail or auditing metrics to trace configuration changes and deployment access."

            return {
                "architecture": {"title": "Terraform Infrastructure State", "content": arch_content},
                "improvements": {"title": "Security & Infra Recommendations", "content": imp_content}
            }

        except Exception as e:
            return {
                "architecture": {
                    "title": "Terraform Parse Failure",
                    "content": f"### ❌ Failed to Parse Terraform File\nAn error occurred while parsing the JSON data: `{str(e)}`"
                },
                "improvements": {
                    "title": "Security & Infra Recommendations",
                    "content": "### ℹ️ Unavailable\nUnable to generate suggestions due to file parsing failure."
                }
            }

    @staticmethod
    def _parse_drawio(file_path, cloud_provider):
        try:
            # Parse XML file
            tree = ET.parse(file_path)
            root = tree.getroot()
            
            # Draw.io saves text values inside mxCell tags
            components = set()
            html_cleaner = re.compile(r"<[^>]*>") # Regex to clean HTML tags like <div>, <b>, etc.

            for cell in root.iter("mxCell"):
                value = cell.get("value")
                if value:
                    # Clean any HTML formatting
                    cleaned_val = html_cleaner.sub("", value).strip()
                    # Filter out short strings, numbers, or standard styling tags
                    if len(cleaned_val) > 2 and not cleaned_val.isdigit():
                        components.add(cleaned_val)

            components_list = list(components)
            if not components_list:
                return {
                    "architecture": {
                        "title": "Draw.io Architecture Diagram",
                        "content": "### ℹ️ Empty Diagram\nThe uploaded `.drawio` diagram file did not contain any text component labels."
                    },
                    "improvements": {
                        "title": "Architecture Recommendations",
                        "content": "### ℹ️ Unavailable\nNo recommendations can be made because no components were identified in the diagram."
                    }
                }

            # Format extracted list
            formatted_components = [f"- **{c}**" for c in sorted(components_list)]
            
            arch_content = f"### 📐 Vector Diagram Components\n"
            arch_content += f"Extracted from editable `.drawio` diagram for **{cloud_provider}**:\n\n"
            arch_content += "\n".join(formatted_components) + "\n"

            imp_content = f"### 💡 Architectural Best Practices\n"
            imp_content += f"Based on the identified design elements from the diagram:\n\n"
            
            # Simple keyword matching for smarter recommendations
            has_db = any(x in " ".join(components_list).lower() for x in ["db", "database", "rds", "postgres", "mysql"])
            has_web = any(x in " ".join(components_list).lower() for x in ["web", "app", "server", "ec2", "vm"])
            
            if has_db:
                imp_content += "- 🗄️ **Multi-AZ Database**: Ensure your database is deployed across multiple availability zones for high availability and failover replication.\n"
                imp_content += "- 🔒 **Private Database Subnets**: Keep database endpoints isolated in private subnets with access restricted via security groups to the application tier.\n"
            if has_web:
                imp_content += "- ⚖️ **Load Balancer Configuration**: Distribute incoming traffic via an Application Load Balancer (ALB) to horizontal server pools to manage spike demands.\n"
                
            imp_content += "- 🌐 **Virtual Private Cloud (VPC)**: Isolate resources within a VPC and structure public vs private subnets with strict routing tables.\n"
            imp_content += "- 🛡️ **Edge Protection**: Place CDN layers (e.g., CloudFront) or WAF in front of web entrypoints to protect infrastructure from DDoS."

            return {
                "architecture": {"title": "Architecture Diagram Overview", "content": arch_content},
                "improvements": {"title": "Design Recommendations", "content": imp_content}
            }

        except Exception as e:
            return {
                "architecture": {
                    "title": "Draw.io Parse Failure",
                    "content": f"### ❌ Failed to Parse Draw.io File\nAn error occurred while reading the XML elements: `{str(e)}`"
                },
                "improvements": {
                    "title": "Architecture Recommendations",
                    "content": "### ℹ️ Unavailable\nUnable to audit diagram due to XML parse error."
                }
            }

    @staticmethod
    def _parse_vsdx(file_path, cloud_provider):
        try:
            # VSDX is a zip file. We can search pages and extract shape labels.
            labels = set()
            html_cleaner = re.compile(r"<[^>]*>")
            
            with zipfile.ZipFile(file_path, "r") as z:
                # Page files are usually located under visio/pages/page[N].xml
                for filename in z.namelist():
                    if "visio/pages/page" in filename and filename.endswith(".xml"):
                        with z.open(filename) as page_file:
                            content = page_file.read().decode("utf-8", errors="ignore")
                            # Visio text elements are inside <v:text> or similar tags
                            matches = re.findall(r"<cp\b[^>]*>(.*?)</cp>|<text\b[^>]*>(.*?)</text>", content, re.DOTALL)
                            for match in matches:
                                text_val = match[0] or match[1]
                                if text_val:
                                    cleaned = html_cleaner.sub("", text_val).strip()
                                    if len(cleaned) > 2 and not cleaned.isdigit() and "{" not in cleaned:
                                        labels.add(cleaned)
                                        
            labels_list = list(labels)
            if not labels_list:
                return {
                    "architecture": {
                        "title": "Visio Architecture Diagram",
                        "content": "### ℹ️ Empty Diagram\nThe uploaded `.vsdx` Visio diagram file did not contain any text component labels."
                    },
                    "improvements": {
                        "title": "Architecture Recommendations",
                        "content": "### ℹ️ Unavailable\nNo recommendations can be made because no components were identified in the diagram."
                    }
                }
                
            formatted = [f"- **{c}**" for c in sorted(labels_list)]
            arch_content = f"### 📐 Visio Diagram Components\n"
            arch_content += f"Extracted from Visio `.vsdx` diagram for **{cloud_provider}**:\n\n"
            arch_content += "\n".join(formatted) + "\n"

            imp_content = f"### 💡 Architectural Best Practices\n"
            imp_content += f"- 🌐 **Isolate Database Tier**: Restrict database inbound access strictly to your application security groups.\n"
            imp_content += f"- ⚖️ **Load Balancing**: Distribute incoming traffic to avoid single points of failure.\n"
            imp_content += f"- 🔒 **IAM Roles**: Use IAM roles to assign credentials instead of saving static access keys in configurations."

            return {
                "architecture": {"title": "Architecture Diagram Overview", "content": arch_content},
                "improvements": {"title": "Design Recommendations", "content": imp_content}
            }

        except Exception as e:
            return {
                "architecture": {
                    "title": "Visio Parse Failure",
                    "content": f"### ❌ Failed to Parse Vsdx File\nAn error occurred while extracting the XML contents: `{str(e)}`"
                },
                "improvements": {
                    "title": "Architecture Recommendations",
                    "content": "### ℹ️ Unavailable\nUnable to audit diagram due to ZIP/XML parse error."
                }
            }

    @staticmethod
    def _parse_image(filename, cloud_provider):
        # We can't parse text elements from binary image data without OCR libraries,
        # so we save the asset and provide standard architectural checklists.
        arch_content = f"### 🖼️ Architecture Diagram Image\n"
        arch_content += f"Diagram image **`{filename}`** has been successfully uploaded for **{cloud_provider}**.\n\n"
        arch_content += "The file has been saved to the project's assets library. You can review the diagram directly from the Assets panel.\n"

        imp_content = f"### 💡 Standard Cloud Best Practices ({cloud_provider})\n"
        imp_content += "To build high-availability and secure deployments, configure your infrastructure according to the following principles:\n\n"
        imp_content += f"- 🌐 **VPC Segmentation**: Segment your networks into public subnets (for load balancers, proxies) and private subnets (for application servers, caching, and databases).\n"
        imp_content += f"- 🔑 **Strict Firewalls**: Restrict security groups/firewall rules to the minimum required ports. SSH (22) and RDP (3389) should never be exposed to the public Internet.\n"
        imp_content += f"- 🗄️ **Automatic Scaling & Backups**: Implement Auto Scaling groups with load balancers, and configure daily automated snapshot/backups for database systems."

        return {
            "architecture": {"title": "Architecture Diagram Overview", "content": arch_content},
            "improvements": {"title": "Cloud Recommendations", "content": imp_content}
        }

    @staticmethod
    def _parse_general_config(file_path, filename, cloud_provider):
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read(2000)
                
            arch_content = f"### 📄 Configuration File Overview\n"
            arch_content += f"File: **`{filename}`** uploaded for **{cloud_provider}**.\n\n"
            arch_content += "#### Content Preview:\n```text\n"
            arch_content += content[:1000]
            if len(content) > 1000:
                arch_content += "\n... [truncated]"
            arch_content += "\n```\n"

            imp_content = f"### 💡 Basic Configuration Hygiene\n"
            imp_content += f"- 🔒 **Remove Secrets**: Ensure this file does not contain any plaintext access keys, token passwords, or API keys.\n"
            imp_content += f"- 📄 **Version Control**: Track configuration template files in Git, and keep instance-specific environments separated."

            return {
                "architecture": {"title": "Infrastructure Config Overview", "content": arch_content},
                "improvements": {"title": "Configuration Recommendations", "content": imp_content}
            }
        except Exception as e:
            return {
                "architecture": {
                    "title": "Parse Failure",
                    "content": f"### ❌ Failed to read file `{filename}`\nError: `{str(e)}`"
                },
                "improvements": {
                    "title": "Recommendations",
                    "content": "### ℹ️ Unavailable"
                }
            }
