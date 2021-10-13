-- This library provides fifo functions
--
-- Usage:
--
--   fifo = Fifo.new()
--   fifo:push(data)
--   daa = fifo:pop()

Fifo = {}
Fifo.meta = {}
Fifo.meta.__index = {}
Fifo.new = function()
        local fifo = {}
        fifo.first = 1 -- Always the first data
        fifo.last = 1 -- Alway the last available + 1
        fifo.data = {}
        setmetatable(fifo, Fifo.meta)
        return fifo
end
Fifo.meta.__index.push = function(fifo, data)
        fifo.data[fifo.last] = data
        fifo.last = fifo.last + 1
end
Fifo.meta.__index.pop = function(fifo, data)
        if fifo.first == fifo.last then
                return nil
        end
        local data = fifo.data[fifo.first]
        fifo.data[fifo.first] = nil
        fifo.first = fifo.first + 1
        if fifo.first == fifo.last then
                fifo.first = 1
                fifo.last = 1
        end
        return data
end
