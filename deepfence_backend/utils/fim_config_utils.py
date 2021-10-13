import yaml
import json
from jsonschema import validate
from jsonschema.exceptions import ValidationError, SchemaError


def validate_fim_config(fim_config):
    with open("/etc/df_sysmon/fim_config_schema.json", "r") as schemafile:
        fim_schema = schemafile.read()
    try:
        validate(yaml.safe_load(fim_config), json.loads(fim_schema))
    except ValidationError as ex:
        print("Fim Config is not valid: \n", ex)
        return False
    except SchemaError as ex:
        print("Fim Schema is not valid: \n", ex)
        return False
    except Exception as ex:
        print("Error: ". ex)
        return False

    return True
