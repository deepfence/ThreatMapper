local socket = require "socket"
package.path = package.path .. ";/usr/local/share/?.lua"
require('fifo')
require('redis')
require('redis_wrapper')
local deepfence_key_redis = "deepfence-key"

local function log(msg)
    core.Debug(tostring(msg))
end

function string.toport(str)
    return (str:byte(1) * 256 + str:byte(2))
end

function string.to4(str)
    return (str:gsub('.', function(c) return string.format('%d.', string.byte(c)) end):sub(1, -2))
end

function string.to6(str)
    return (str:gsub('..', function(c) return string.format('%02x%02x:', string.byte(c), string.byte(c, 2)) end):sub(1, -2))
end

function string.tohex(str)
    return (str:gsub('.', function(c) return string.format('%02x', string.byte(c)) end))
end

local function socks5(txn)
    --[[
        References:
        - https://tools.ietf.org/html/rfc1928
        - https://github.com/detailyang/lua-resty-socks5-server/blob/master/lib/resty/socks5/server.lua
        - https://gist.github.com/trimsj/da37da55994a07bc1c602a22f13cbdb4
    --]]
    --[[
        Receive Method:
        Version = 5
    --]]
    local c = txn.req:get()
    if c == nil then
        do return end
    end
    if c:byte(1) ~= 5 then return end
    --[[
        Send Method
        -  X'00' NO AUTHENTICATION REQUIRED
        -  X'02' USERNAME/PASSWORD -> Request client for username, password
    --]]
    local enable_auth = os.getenv("ENABLE_AUTH")
    if enable_auth == "true" then
        txn.res:send('\5\2')
    else
        txn.res:send('\5\0')
    end
    if enable_auth == "true" then
        --[[
            Receive Auth (deepfence_key will be username)
            | VER | UNAME_LEN | UNAME | PASSWD_LEN | PASSWD |
        --]]
        local c = txn.req:get()
        if c == nil then
            do return end
        end
        local username_len = c:byte(2)
        local deepfence_key = c:sub(3, 2 + username_len)
        -- local password_len = c:byte(3 + username_len)
        -- local password = c:sub(4 + username_len, 3 + username_len + password_len)
        --[[
            Send auth response
            -  X'00' SUCCEEDED
            -  X'01' FAILURE
        --]]
        if deepfence_key == "" then
            txn.res:send('\5\1')
            do return end
        end

        local r_wrap = redis_wrapper.new(os.getenv("REDIS_HOST"), os.getenv("REDIS_PORT"), 5)
        -- timeout 500 ms
        local conn = r_wrap:get(1500)
        if conn == nil then
            -- log ("Unable to connect to redis")
            txn.set_var(txn, "txn.authorized", false)
            do return end
        end
        local pcallret
        local valueret
        pcallret, valueret = pcall(conn.client.hexists, conn.client, deepfence_key_redis, deepfence_key)
        if pcallret == false then
            txn.res:send('\5\1')
            do return end
        end
        r_wrap:release(conn)
        if valueret == false then
            txn.res:send('\5\1')
            do return end
        end
        txn.res:send('\5\0')
    end
    --[[
        Receive Requests
        -  VER   protocol version: X'05'
        -  CMD
            -  CONNECT X'01'
            -  BIND X'02'
            -  UDP ASSOCIATE X'03'
        -  RSV    RESERVED
        -  ATYP   address type of following address
             -  IP V4 address: X'01'
             -  DOMAINNAME: X'03'
             -  IP V6 address: X'04'
        -  DST.ADDR   desired destination address
        -  DST.PORT   desired destination port in network octet order
    --]]
    local c = txn.req:get()
    if c == nil then
        do return end
    end
    local host = ""
    local dst = ""
    local port = ""
    local family = ""
    if c:byte(1) ~= 5 or c:byte(2) ~= 1 then return end
    if c:byte(4) == 1 then
        dst = c:sub(5, 8):to4()
        port = c:sub(9, 10):toport()
        family = 'inet'
    elseif c:byte(4) == 4 then
        dst = c:sub(5, 20):to6()
        port = c:sub(21, 22):toport()
        family = 'inet6'
    elseif c:byte(4) == 3 then
        local len = c:byte(5)
        host = c:sub(6, 5 + len)
        port = c:sub(6 + len, 7 + len):toport()
        local addr = socket.dns.getaddrinfo(host)
        if not addr then return end
        dst = addr[1].addr
        family = addr[1].family
    else return
    end
    txn:set_var('txn.dst', dst)
    txn:set_var('txn.dst_host', host)
    txn:set_var('txn.port', port)
    txn:set_var('txn.family', family)
    --[[
        Send Replies
    --]]
    txn.res:send('\5\0\0\1\0\0\0\0\0\0')
end

core.register_action('socks5', { 'tcp-req', 'tcp-res' }, socks5, 0)