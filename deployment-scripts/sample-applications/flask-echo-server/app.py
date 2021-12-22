import time

from flask import Flask, jsonify, request

app = Flask(__name__)
methods = ["GET", "POST", "PATCH", "DELETE"]


def validate_status_code(status_code):
    if status_code < 600:
        return True
    return False


def extract(d):
    return {key: value for (key, value) in d.items()}


@app.route('/', methods=methods, defaults={'path': ''})
@app.route('/<path:path>', methods=methods)
def echo(path):
    status_code = request.args.get('status') or 200
    status_code = int(status_code)
    if not validate_status_code(status_code):
        status_code = 200

    data = {
        'success': True,
        'status': status_code,
        'time': time.time(),
        'path': request.path,
        'script_root': request.script_root,
        'url': request.url,
        'base_url': request.base_url,
        'url_root': request.url_root,
        'method': request.method,
        'headers': extract(request.headers),
        'data': request.data.decode(encoding='UTF-8'),
        'host': request.host,
        'args': extract(request.args),
        'form': extract(request.form),
        'json': request.json,
        'cookies': extract(request.cookies)
    }

    response = jsonify(data)
    response.status_code = status_code
    return response


def main():
    app.run(port=5000, host="0.0.0.0")


if __name__ == '__main__':
    main()
