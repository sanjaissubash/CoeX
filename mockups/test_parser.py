import sys
import os

# Adjust path to import backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set mock flask app context
from flask import Flask
app = Flask("test")
app.config["STORAGE_ROOT"] = "storage"
with app.app_context():
    from backend.services.infra_parser import InfraParserService
    
    print("=========================================")
    print("1. RUNNING TERRAFORM STATE PARSER TEST")
    print("=========================================")
    tf_res = InfraParserService.parse_file("mockups/aws_infrastructure.tfstate", "aws_infrastructure.tfstate", "AWS")
    print(f"\n[Architecture Overview]\nTitle: {tf_res['architecture']['title']}\n")
    print(tf_res['architecture']['content'])
    print(f"\n[Improvements / Security Audit]\nTitle: {tf_res['improvements']['title']}\n")
    print(tf_res['improvements']['content'])
    
    print("\n=========================================")
    print("2. RUNNING DRAW.IO XML PARSER TEST")
    print("=========================================")
    drawio_res = InfraParserService.parse_file("mockups/network_diagram.drawio", "network_diagram.drawio", "AWS")
    print(f"\n[Architecture Overview]\nTitle: {drawio_res['architecture']['title']}\n")
    print(drawio_res['architecture']['content'])
    print(f"\n[Improvements / Best Practices]\nTitle: {drawio_res['improvements']['title']}\n")
    print(drawio_res['improvements']['content'])
    print("=========================================")
