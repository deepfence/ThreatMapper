package.path = package.path .. ";/usr/local/share/?.lua"
require('fifo')
require('redis')
require('redis_wrapper')
local r_wrap
local enable_auth = ""
local conn
local deepfence_key = "deepfence-key"

local function log(msg)
    core.Debug(tostring(msg))
end

function deepfence_key_verify(txn)
    -- local mandatory_auth_verify = txn.get_var(txn, "txn.mandatory_auth_verify")
    -- if enable_auth == "false" and mandatory_auth_verify ~= "true" then
    if enable_auth == "false" then
        txn.set_var(txn, "txn.authorized", "not_enabled")
        do return end
    end
    local token = txn.sf:req_hdr("deepfence-key")
    if token == nil or token == "" then
        token = txn.get_var(txn, "txn.deepfence_key")
    end
    if token == nil or token == "" then
        txn.set_var(txn, "txn.authorized", "false")
        do return end
    end
    -- timeout 1500 ms
    conn = r_wrap:get(1500)
    if conn == nil then
        -- log ("Unable to connect to redis")
        txn.set_var(txn, "txn.authorized", "false")
        do return end
    end
    local pcallret
    local valueret
    pcallret, valueret = pcall(conn.client.hexists, conn.client, deepfence_key, token)
    -- If there is a connection issue with redis, retry once
    if pcallret == false then
        r_wrap:renew()
        pcallret, valueret = pcall(conn.client.hexists, conn.client, deepfence_key, token)
        if pcallret == false then
            txn.set_var(txn, "txn.authorized", "false")
            do return end
        end
    end
    r_wrap:release(conn)
    if valueret == true then
        txn.set_var(txn, "txn.authorized", "true")
        do return end
    end
    txn.set_var(txn, "txn.authorized", "false")
end


core.register_init(function()
    enable_auth = os.getenv("ENABLE_AUTH")
    r_wrap = redis_wrapper.new(os.getenv("REDIS_HOST"), os.getenv("REDIS_PORT"), 500)
end)

core.register_action('deepfence-key-verify', { 'http-req' }, deepfence_key_verify, 0)