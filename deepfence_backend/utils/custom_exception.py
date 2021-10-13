class CustomException(Exception):
    status_code = 400

    def __init__(self, message=None, status_code=None, payload=None):
        super(CustomException, self).__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        return rv


class InvalidUsage(CustomException):
    status_code = 400


class InternalError(CustomException):
    status_code = 500


class RequestTimeout(CustomException):
    status_code = 408


class Forbidden(CustomException):
    status_code = 403


class NotFound(CustomException):
    status_code = 404


class SystemCorrelationRuleException(Exception):
    pass


class MultipleActiveLicensesFound(Exception):
    pass


class MultipleCompaniesFound(Exception):
    pass


class EmailKeyNotFound(Exception):
    pass


class ScopeError(Exception):
    pass


class DFError(Exception):
    def __init__(self, message, code=None, error=None):
        self.message = message
        self.code = code
        self.error = error
        msg = "DFError: {}".format(message)
        if code and error:
            msg = "DFError: {}:{} => {}".format(message, code, error)
        elif code:
            msg = "DFError: {}:{}".format(message, code)
        elif error:
            msg = "DFError: {} => {}".format(message, error)
        super(DFError, self).__init__(msg)
