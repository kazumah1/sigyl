import argparse
from formats import openai, langchain, claude
from schema_writer import write_yaml
from utils import detect_format

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("path", help="Path to tools file (.py or .json)")
    parser.add_argument("--out", default="tools.yaml")
    args = parser.parse_args()

    fmt = detect_format(args.path)
    if fmt == "openai":
        tools = openai.load_tools(args.path)
    elif fmt == "langchain":
        tools = langchain.load_tools(args.path)
    elif fmt == "claude":
        tools = claude.load_tools(args.path)
    else:
        raise Exception("Unsupported tool format")

    write_yaml(tools, args.out)

if __name__ == "__main__":
    main()