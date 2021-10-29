import urllib.parse
import re
import arrow
import uuid

from utils.constants import INTERVAL_MAPPING, MIN_PASSWORD_LENGTH, \
    CVE_INDEX, CVE_SCAN_LOGS_INDEX, TABLE_COLUMN_NON_TEXT_FIELD


def get_epochtime():
    time_now = arrow.now()
    return int(time_now.timestamp()) * 1000 + time_now.microsecond


def get_eula_text():
    """
    This function fetches `EULA` from license server. If it is unavailable, then it
    is taken from utils/eula.py
    """
    from utils.eula import EULA
    return EULA


def validate_password_policy(password):
    """
    Password should contain
        - at least 1 uppercase character (A-Z)
        - at least 1 lowercase character (a-z)
        - at least 1 digit (0-9)
        - at least 1 special character (punctuation)
    """
    # app.logger.info("Validating password policy")

    msg = "At least 1 uppercase character"
    if not any(c.isupper() for c in password):
        return False, msg

    msg = "At least 1 lowercase character"
    if not any(c.islower() for c in password):
        return False, msg

    msg = "At least 1 digit"
    if not any(c.isdigit() for c in password):
        return False, msg

    msg = "At least 1 special character (punctuation)"
    special_chars = "!\"#$%&'()*+,-./:;<=>?@[\]^_`{|}~"
    if not any(c in special_chars for c in password):
        return False, msg

    msg = "valid"

    # app.logger.info("Password policy validated [{}]".format(msg))
    return True, msg


def password_policy_check(password):
    msg = "success"
    if len(password) < MIN_PASSWORD_LENGTH:
        msg = "Min password length is {}".format(MIN_PASSWORD_LENGTH)
        return False, msg
    elif not validate_password_policy(password)[0]:
        return False, validate_password_policy(password)[1]
    else:
        return True, msg


def calculate_interval(number, time_unit):
    # For show all we use the interval that is specified for 1year.
    if time_unit == 'all':
        string = '1year'
    else:
        string = str(number) + time_unit

    if number > 1:
        string += 's'
    return INTERVAL_MAPPING.get(string)


def get_rounding_time_unit(time_unit):
    rounding_time_unit = time_unit

    # For Month use Day as the rounding time unit.
    if time_unit == 'M' or time_unit == 'all':
        rounding_time_unit = 'd'
    return rounding_time_unit


def sort_expression(index_name, sort_order,sort_by="@timestamp"):
    """
    Default sort on timestamp and sort alphabetically on description.
    """
    if sort_by not in TABLE_COLUMN_NON_TEXT_FIELD:
        sort_by = "{0}.keyword".format(sort_by)
        
    if index_name == CVE_INDEX:
        return "{0}:{1},cve_description.keyword:asc".format(sort_by, sort_order)
    elif index_name == CVE_SCAN_LOGS_INDEX:
        return "{0}:{1},scan_id.keyword:{1}".format(sort_by, sort_order)
    else:
        return "{0}:{1}".format(sort_by, sort_order)


def calculate_interval_for_show_all_filter(min_time):
    min_time = arrow.get(min_time).datetime
    max_time = arrow.now()

    difference = max_time - min_time
    days = difference.days
    minutes = difference.seconds // 60

    if days:
        if days < 7:
            interval = calculate_interval(24, 'hour')
        elif days < 30:
            interval = calculate_interval(7, 'day')
        elif days < 60:
            interval = calculate_interval(30, 'day')
        elif days < 90:
            interval = calculate_interval(60, 'day')
        elif days < 180:
            interval = calculate_interval(90, 'day')
        else:
            interval = calculate_interval(1, 'year')
    elif minutes:
        if minutes < 15:
            interval = calculate_interval(15, 'minute')
        elif minutes < 30:
            interval = calculate_interval(30, 'minute')
        elif minutes < 60:
            interval = calculate_interval(1, 'hour')
        elif minutes < 240:
            interval = calculate_interval(4, 'hour')
        elif minutes < 720:
            interval = calculate_interval(12, 'hour')
        elif minutes < 1440:
            interval = calculate_interval(24, 'hour')
        else:
            interval = calculate_interval(24, 'hour')
    else:
        interval = calculate_interval(15, 'minute')

    return interval


def unique_execution_id():
    return str(uuid.uuid4())


def url_encode_component(input):
    return urllib.parse.quote(input)


def format_es_resp_for_api(es_hits, rename_doc_id):
    """
    Format vulnerabilities es response
    """
    rename_doc_id = "doc_id"
    if type(es_hits) is not list:
        es_hits = [es_hits]
    es_resp_formatted = []
    for doc in es_hits:
        try:
            if "doc_id" in doc["_source"]:
                doc["_source"][rename_doc_id] = doc["_source"].pop("doc_id")
            else:
                doc["_source"][rename_doc_id] = doc["_id"]
        except:
            pass
        es_resp_formatted.append(doc["_source"])
    return es_resp_formatted


# def _check_list(src, dst):
#     cidrChar = '/'
#     listLen = len(dst)
#     srcVal = IPAddress(src)
#     for i in range(0, listLen):
#         if (cidrChar in dst[i]):
#             if (srcVal in IPNetwork(dst[i])):
#                 return True
#         else:
#             if (srcVal == IPAddress(dst[i])):
#                 return True
#     return False


def merge_lists(l1, l2, key, case_insensitive=False):
    merged = {}
    for item in l1 + l2:
        value = item.get(key)
        if case_insensitive:
            value = value.lower() if value else value
        if value in merged:
            merged[value].update(item)
        else:
            merged[value] = item
    return [val for (_, val) in merged.items()]


def inject_serial_number(lists_of_dicts, index_key_name="index", index_start=1):
    return [{**el, index_key_name: index_start + i} for i, el in enumerate(lists_of_dicts)]


def colorCode(color):
    colorCodeMap = {
        "BLUE": '#0276c9',
        "LIGHT_ORANGE": '#e08a25',
        "YELLOW": '#e7d036',
        "RED": '#db2547',
        "ORANGE": '#F55D3E',
        "PALE_YELLOW": '#E7C663',
        "VIOLET": '#8024B1',
        "GREEN": '#6CCF3F',
        "GREY": '#6D7A82',
        "BLUE_OPAQUE": '#0b3e58',
        "LIGHT_ORANGE_OPAQUE": '#58350b',
        "YELLOW_OPAQUE": '#58481c',
        "RED_OPAQUE": '#580b1d',
        "ORANGE_OPAQUE": '#753328',
        "GREY_OPAQUE": '#393E41',
        "PALE_YELLOW_OPAQUE": '#9C7F2A',
        "VIOLET_OPAQUE": '#3C1253',
        "GREEN_OPAQUE": '#537A27',
    }
    return colorCodeMap.get(color, None)


def mask_url(url, integration):
    # https://hooks.slack.com/services/qwfknqwklfn => https://hooks.slack.com/services/qwf*****lfn
    if integration == 'slack':
        matches = re.search(
            "https:\/\/hooks\.slack\.com\/services\/([0-9A-Za-z]{1,})\/([0-9A-Za-z]{1,})\/([0-9A-Za-z]{1,})$", url)
        if matches:
            all_matched = list(matches.groups())
            for i in range(len(all_matched)):
                all_matched[i] = all_matched[i][:3] + "*" * (len(all_matched[i]) - 6) + all_matched[i][-3:]
            return "https://hooks.slack.com/services/" + "/".join(all_matched)
        else:
            return url
    if integration == 'microsoft_teams':
        matches = re.search("(https:.*?\/IncomingWebhook\/)(.*?)\/(.*?)$", url)
        if matches:
            all_matched = list(matches.groups())[1:]
            for i in range(len(all_matched)):
                all_matched[i] = all_matched[i][:3] + "*" * (len(all_matched[i]) - 6) + all_matched[i][-3:]
            return list(matches.groups())[0] + "/".join(all_matched)
        else:
            return url
    if integration == 'sumo_logic':
        matches = re.search("(https:.*?\/http)\/(.*?)$", url)
        if matches:
            all_matched = list(matches.groups())[1:]
            for i in range(len(all_matched)):
                all_matched[i] = all_matched[i][:4] + "*" * (len(all_matched[i]) - 8) + all_matched[i][-4:]
            return list(matches.groups())[0] + "/".join(all_matched)
        else:
            return url


def mask_api_key(key):
    # wjhEFBWJEwlkfnwf => wjh**********nwf
    key = key[:3] + "*" * (len(key) - 6) + key[-3:]
    return key
