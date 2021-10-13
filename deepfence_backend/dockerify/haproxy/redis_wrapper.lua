-- redis-wrapper : Add connection pool to the Lua Redis library
-- 
-- Copyright 2018 Thierry Fournier 
--
-- This lib is compliant with HAProxy cosockets
--
package.path  = package.path  .. ";redis-lua/src/?.lua"
require("fifo")

redis_wrapper = {}
redis_wrapper.redis = require("redis")

redis_wrapper.new = function(host, port, pool_sz)
        local r = {}
        r.host = host
        r.port = port
        r.pool = Fifo.new()
        r.nb_max = pool_sz
        r.nb_cur = 0
        r.nb_avail = 0
        r.nb_err = 0
        setmetatable(r, redis_wrapper.meta);
        return r
end

redis_wrapper.meta = {}
redis_wrapper.meta.__index = {}
redis_wrapper.meta.__index.new_conn = function(r)

        -- Limit the max number of connections
        if r.nb_cur >= r.nb_max then
                return nil
        end

        -- Increment the number of connexions before the real
        -- connexion, because the connection does a yield and
        -- another connexion may be started. If the creation
        -- fails decrement the counter.
        r.nb_cur = r.nb_cur + 1

        -- Redis session
        local sess = {}

        -- create and connect new tcp socket
        -- Shyam testing
        -- sess.tcp = core.tcp();
        -- sess.tcp:settimeout(1);
        -- if sess.tcp:connect(r.host, r.port) == nil then
        --       r.nb_cur = r.nb_cur - 1
        --       return nil
        -- end

        -- use the lib_redis library with this new socket
        -- sess.client = redis_wrapper.redis.connect({socket=sess.tcp});
        sess.client = redis_wrapper.redis.connect(r.host,tonumber(r.port));

        -- One more session created
        r.nb_avail = r.nb_avail + 1
        return sess

end

redis_wrapper.meta.__index.get = function(r, wait)
        local tspent = 0
        local conn
        while true do

                -- Get entry from pool
                conn = r.pool:pop()
                if conn ~= nil then
                        r.nb_avail = r.nb_avail - 1
                        return conn
                end

                -- Slot available: create new connection
                if r.nb_cur < r.nb_max then
                        conn = r:new_conn()
                        if conn ~= nil then
                                r.nb_avail = r.nb_avail - 1
                                return conn
                        end
                end

                -- no slot available wait a while
                if tspent >= wait then
                        return nil
                end
                -- Shyam testing
                -- core.msleep(50)
                socket.sleep(0.5)
                tspent = tspent + 50
        end
end

redis_wrapper.meta.__index.release = function(r, conn)
        r.nb_avail = r.nb_avail + 1
        r.pool:push(conn)
end

redis_wrapper.meta.__index.renew = function(r, conn)
        if conn ~= nil then
                conn.tcp:close()
        end
        r.nb_cur = r.nb_cur - 1
        conn = r:new_conn()
        if conn ~= nil then
                r:release(conn)
        end
end
