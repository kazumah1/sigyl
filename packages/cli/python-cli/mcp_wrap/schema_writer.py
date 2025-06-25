import yaml

def write_yaml(tools, path):
    with open(path, "w") as f:
        yaml.dump(tools, f, sort_keys=False)