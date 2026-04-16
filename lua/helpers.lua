-- Helpers injected by pi-playdate at DAP connect time.
-- Depends on `inspect` (vendored from kikito/inspect.lua) having been defined
-- prior to this file being loaded.

-- Pretty-print any value or sequence of values.
-- Multi-return handling: readAccelerometer() returns (x, y, z) -> "(0.5, 0, 0.5)".
function __pd_dump(...)
  local n = select("#", ...)
  if n == 0 then return "nil" end
  local args = table.pack(...)
  if n == 1 then return inspect(args[1]) end
  local parts = {}
  for i = 1, n do parts[i] = inspect(args[i]) end
  return "(" .. table.concat(parts, ", ") .. ")"
end

-- Dump common simulator/device hardware state in one round-trip.
-- Returns a pipe-separated key=value string that playdate_sim_state parses.
function __pd_state()
  local function tri(fn)
    local ok, a, b, c = pcall(fn)
    if not ok then return nil, nil, nil end
    return a, b, c
  end
  local ax, ay, az = tri(function() return playdate.readAccelerometer() end)
  local parts = {
    "crank_pos=" .. tostring(playdate.getCrankPosition()),
    "crank_change=" .. tostring(playdate.getCrankChange()),
    "crank_docked=" .. tostring(playdate.isCrankDocked()),
    "accel_x=" .. tostring(ax),
    "accel_y=" .. tostring(ay),
    "accel_z=" .. tostring(az),
    "btn_up=" .. tostring(playdate.buttonIsPressed(playdate.kButtonUp)),
    "btn_down=" .. tostring(playdate.buttonIsPressed(playdate.kButtonDown)),
    "btn_left=" .. tostring(playdate.buttonIsPressed(playdate.kButtonLeft)),
    "btn_right=" .. tostring(playdate.buttonIsPressed(playdate.kButtonRight)),
    "btn_a=" .. tostring(playdate.buttonIsPressed(playdate.kButtonA)),
    "btn_b=" .. tostring(playdate.buttonIsPressed(playdate.kButtonB)),
    "fps=" .. tostring(playdate.getFPS()),
    "elapsed_time=" .. tostring(playdate.getElapsedTime()),
    "current_time_ms=" .. tostring(playdate.getCurrentTimeMilliseconds()),
    "battery_pct=" .. tostring(playdate.getBatteryPercentage()),
  }
  return table.concat(parts, "|")
end
