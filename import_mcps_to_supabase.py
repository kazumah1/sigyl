"""
Script to import MCP packages and tools from mcps.csv into Supabase.

Instructions:
- Install dependencies: pip install supabase pandas python-dotenv
- Set your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in a .env file or as environment variables.
- Review this script carefully before running!
- To run: python import_mcps_to_supabase.py

This script will:
- Read mcps.csv
- For each unique package, insert into mcp_packages if not already present
- For each tool, insert into mcp_tools if not already present for the package
- Skip duplicates
"""
import os
import uuid
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment or .env file.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Read CSV
df = pd.read_csv("mcps.csv")

# Helper: get or create package, return package_id
def get_or_create_package(row):
    name = row["name"]
    source_api_url = row["githublink"]
    description = row["description"]
    smitherylink = row["smitherylink"]
    # Check if package exists
    existing = supabase.table("mcp_packages").select("id").eq("name", name).eq("source_api_url", source_api_url).execute()
    if existing.data:
        return existing.data[0]["id"]
    # Insert new package
    pkg = {
        "id": str(uuid.uuid4()),
        "name": name,
        "description": description,
        "source_api_url": source_api_url,
        # version, author_id, tags, downloads_count, created_at, updated_at left as null/default
    }
    res = supabase.table("mcp_packages").insert(pkg).execute()
    return res.data[0]["id"]

# Helper: check if tool exists for package
def tool_exists(package_id, tool_name):
    existing = supabase.table("mcp_tools").select("id").eq("package_id", package_id).eq("tool_name", tool_name).execute()
    return bool(existing.data)

# Main import
for idx, row in df.iterrows():
    package_id = get_or_create_package(row)
    tool_name = row["tool_name"]
    tool_description = row["tool_description"]
    if not tool_name:
        continue  # skip if no tool name
    if tool_exists(package_id, tool_name):
        continue  # skip duplicate tool
    tool = {
        "id": str(uuid.uuid4()),
        "package_id": package_id,
        "tool_name": tool_name,
        "description": tool_description,
        "input_schema": {},
        "output_schema": {},
    }
    supabase.table("mcp_tools").insert(tool).execute()

print("Import complete. Please review your Supabase tables.") 