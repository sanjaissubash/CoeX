import sqlite3
import os

DB_PATH = "../storage/coex.db"

prompt_template = """You are an expert AI Prompt Engineer. Your ONLY job is to write a prompt that the user can copy and paste into another external AI (like ChatGPT or Claude).

I will provide you with a Project Description, Knowledge Blocks, Task Context, and a Note.
Based on the {workflow_name} workflow, you must generate a highly effective, detailed prompt that instructs the external AI on exactly what to do.

RULES FOR THE PROMPT YOU GENERATE:
1. It must be written from the perspective of the user asking the external AI for help. (e.g. "I need you to help me with...")
2. It must EXPLICITLY INCLUDE all necessary technical details (instance IDs, server names, Terraform states, IP addresses) extracted from the Project Knowledge and Task Context, so the external AI has all the facts.
3. It must instruct the external AI to adhere strictly to the {workflow_name} rules: {workflow_specific_rules}
4. It must ask the external AI to actually provide the solution, commands, or drafts required by the note.
5. NO CHITCHAT. Output ONLY the raw prompt text that the user will copy. Do not include introductory text like "Here is the prompt:".

Example of what you should output:
"Act as an expert DevOps engineer. I need help troubleshooting an issue with my AWS EC2 instance (ID: i-12345) based on my task 'Fix Prod Down'. Please provide strictly readonly AWS CLI commands to verify the state of the security group 'web_sg'..."
"""

workflow_specific_rules_map = {
    "techie_generate_draft_internal": ("Draft Internal Update", "Instruct the AI to draft a concise, technical Slack/Teams update for an internal engineering team, forbidding guesses about metrics or statuses."),
    "techie_generate_draft_client": ("Draft Client Update", "Instruct the AI to draft a professional, client-facing Slack/Teams update. It must be explicitly forbidden from making unauthorized promises or inventing statuses."),
    "techie_generate_readonly_checks": ("Readonly Checks", "The generated prompt MUST explicitly instruct the target AI to output ONLY non-destructive, readonly commands to verify state (e.g. `aws ec2 describe-...`), and MUST strictly forbid any modifying or destructive commands."),
    "techie_generate_troubleshoot": ("Troubleshooting", "The generated prompt MUST explicitly instruct the AI to output: 1) Readonly commands to confirm the issue. 2) Exact backup and restore/mitigation steps. 3) Post-verification checks."),
    "techie_generate_setup_manual": ("Manual Setup", "The generated prompt MUST explicitly instruct the AI to output: 1) Readonly prerequisite checks. 2) Console or CLI step-by-step setup instructions. 3) An estimated cost review."),
    "techie_generate_setup_iac": ("IaC Setup", "The generated prompt MUST explicitly instruct the AI to output: 1) Readonly compatibility checks. 2) Proper Git code flow. 3) The exact IaC code. 4) An estimated cost review.")
}

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    for name, (workflow_name, rules) in workflow_specific_rules_map.items():
        text = prompt_template.format(
            workflow_name=workflow_name,
            workflow_specific_rules=rules
        )
        cursor.execute("UPDATE prompts SET prompt_text = ? WHERE name = ?", (text, name))
        print(f"Updated {name}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    main()
