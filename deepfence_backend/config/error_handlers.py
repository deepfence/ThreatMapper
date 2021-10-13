from utils.response import set_response


def handle_invalid_usage(error):
    return set_response(error=error.to_dict(), status=error.status_code)
