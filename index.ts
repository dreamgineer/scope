import { file, $, type ErrorLike } from "bun";
import { cpus, totalmem } from "os";
import { systemBus } from "dbus-ts";
import type { Interfaces as NetworkManager } from "@dbus-types/networkmanager";
import { spawn } from "child_process";
const bus = await systemBus<NetworkManager>();
var ready = false;

const loading = ["󰪞", "󰪟", "󰪠", "󰪡", "󰪢", "󰪣", "󰪤", "󰪥"];
const DEBUG = process.argv.includes("--debug");

console.log(
  JSON.stringify({
    text: "",
    alt: "",
    tooltip: "",
    class: "",
    percentage: 0,
  })
);

const data = {
  bat: -1, // Battery
  vol: -1, // Volume
  cpu: -1, // CPU
  ram: -1, // Memory
  ntf: -1, // Notifications
  rec: -1, // Record
  net: "", // Network
  mut: false, // Muted
  low: false, // Low battery
};

const nmbus = await bus.getInterface(
  "org.freedesktop.NetworkManager",
  "/org/freedesktop/NetworkManager",
  "org.freedesktop.NetworkManager"
);

async function getBatPercent() {
  const [nowStr, fullStr, status] = await Promise.all([
    file("/sys/class/power_supply/BAT0/energy_now").text(),
    file("/sys/class/power_supply/BAT0/energy_full").text(),
    file("/sys/class/power_supply/BAT0/status").text(),
  ]);
  const now = parseInt(nowStr.trim());
  const full = parseInt(fullStr.trim());
  const percent = Math.round((now / full) * 100);
  const low = percent < 40 && status.includes("Discharging");
  if (low == data.low && percent == data.bat) return;
  data.bat = percent;
  data.low = low;
  update();
}

async function getVolume() {
  const out = await $`wpctl get-volume @DEFAULT_AUDIO_SINK@`.text();
  const [, vol, muted] =
    out.match(/^Volume: ([0-9]+(?:\.[0-9]+))?( \[MUTED\])?$/m) ?? [];
  const volume = Math.round(muted ? 0 : parseFloat(vol ?? "0") * 100);
  if (volume == data.vol && !!muted == data.mut) return;
  data.vol = volume;
  data.mut = !!muted;
  update(ShowType.VOL);
}

var previousTotal: number[] = [],
  previousIdle: number[] = [];
function getCpuPercent() {
  const cpu = cpus();
  const percents = cpu.map((core, i) => {
    const total = Object.values(core.times).reduce((a, b) => a + b, 0);
    const idle = core.times.idle;
    const totalDelta = total - (previousTotal[i] ?? 0);
    const idleDelta = idle - (previousIdle[i] ?? 0);
    previousTotal[i] = total;
    previousIdle[i] = idle;
    return totalDelta > 0 ? ((totalDelta - idleDelta) / totalDelta) * 100 : 0;
  });
  const perc = Math.round(
    percents.reduce((a, b) => a + b, 0) / percents.length
  );
  if (data.cpu > 80) setImmediate(update);
  data.cpu = perc;
}

async function getMemPercent() {
  const available =
    1024 *
    Number(
      (await file("/proc/meminfo").text()).match(/MemAvailable: +(\d+)/)?.[1]
    );
  const used = Math.round((1 - available / totalmem()) * 100);
  if (data.ram > 80) setImmediate(update);
  data.ram = used;
}

async function getNetwork() {
  const out = await $`nmcli -g general.connection,general.type d show`.text();
  const networks = out.matchAll(/(.*)\n(.+)\n\n/gm);
  for (const network of networks) {
    if (!["wifi", "ethernet", "wimax", "gsm"].includes(`${network[2]}`))
      continue;
    data.net = network[1] || "";
    if (network) update(ShowType.NET);
    else update();
  }
}

async function getNotification() {
  data.ntf = await $`swaync-client -c`.json();
  update();
}

var beforeRecord = 0;
async function getRecord() {
  const isRecording =
    (await $`pidof wf-recorder`.nothrow().quiet()).exitCode === 0;
  if (!isRecording || beforeRecord == 0) beforeRecord = Date.now();
  const recordTime = Math.round((Date.now() - beforeRecord) / 1000);
  if (recordTime < 1) {
    const was = data.rec;
    data.rec = -1;
    if (was > 1) update();
    return;
  } else data.rec = recordTime;
  update();
}

var overlay: Timer | null = null;
var tick: (value?: unknown) => void = () => {};
async function update(timeout?: ShowType) {
  if (DEBUG) console.log("\u001bcData", JSON.stringify(data), "\nLast", last);
  if (!ready) return tick();
  const { bat, vol, cpu, ram, ntf, rec, net, mut, low } = data;

  const volText = mut ? `` : `${vol}% ${vol < 20 ? "" : " "}`;

  if (timeout !== undefined) {
    // Temporary indicators
    if (overlay) clearTimeout(overlay);
    overlay = setTimeout(() => {
      overlay = null;
      update();
    }, 5000);
    switch (timeout) {
      case ShowType.NET:
        return show({ text: `${net} `, class: "net", tooltip: net });
      case ShowType.VOL:
        return show({
          text: volText,
          class: "vol",
          tooltip: `Volume: ${vol}%`,
        });
      default:
        return;
    }
  } else if (overlay) return;
  else if (cpu > 80)
    show({ text: `${cpu}% `, class: "cpu", tooltip: "High CPU usage(>80%)" });
  else if (low) {
    const icons = ["󰁻", "󰁼", "󰁾", "󰂀", "󰂂", "󰁹"];
    const icon = low ? icons[Math.floor(bat / 20)] : "󰁺";
    show({
      text: `${bat}% ${icon}`,
      class: "bat" + (bat < 15 ? "critical" : bat < 25 ? "warning" : ""),
      tooltip: (bat < 15 ? "Critically l" : "L") + "ow battery",
    });
  } else if (ram > 80)
    show({
      text: `${ram}% `,
      class: "mem",
      tooltip: "High Memory usage(>80%)",
    });
  else if (!net) show({ text: "󰖪", class: "net", tooltip: "Disconnected" });
  else if (rec > 0) {
    const minutes = Math.floor(rec / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(rec % 60)
      .toString()
      .padStart(2, "0");
    if (rec < 5)
      return show({
        text: `󰑋`,
        alt: "recording",
        tooltip: `Recording with wf-recorder (${minutes}:${seconds})`,
        class: "rec",
      });
    show({
      text: `󰑋 ${minutes}:${seconds}`,
      alt: "recording",
      tooltip: "Recording with wf-recorder",
      class: "rec",
    });
  } else if (mut || vol > 70)
    show({
      text: volText,
      tooltip: mut ? "Volume muted" : `High volume(>70%)`,
      class: "vol",
    });
  else
    show({
      text: (ntf ? ntf + " " : "") + "",
      tooltip: DEBUG
        ? "Debug mode"
        : Object.keys(data)
            .map((e) => e + ": " + JSON.stringify(data[e as keyof typeof data]))
            .join("\n"),
      class: "ntf",
    });
}

var last: string = "";
function show(data: Data) {
  try {
    const out = JSON.stringify(data);
    if (out == last) return;
    last = out;
    if (DEBUG) console.log("Now ", out);
    else console.log(out);
  } catch {}
}
type Data = {
  text: string;
  alt?: string;
  tooltip: string;
  class: string;
  percentage?: number;
};
enum ShowType {
  NET,
  VOL,
}

async function init() {
  // Listening
  spawn("swaync-client", ["-s"]).stdout.on("data", getNotification);
  spawn("pw-cli").stdout.on("data", (dat) => {
    const msg: string = dat.toString();
    if (msg.match(/node \d+ changed/)) getVolume();
  });
  nmbus.on("StateChanged", getNetwork);
  // Scheduled + initialization
  scheduler(1000, getCpuPercent, getBatPercent, getMemPercent, getRecord);
  // Initialization
  getVolume();
  getNetwork();

  // Unlock the update function
  if (!DEBUG) {
    for (let i = 0; i < loading.length; i++) {
      show({ text: loading[i]!, class: "", tooltip: "Loading " + i });
      await new Promise((r) => {
        const timer = setTimeout(r, 100);
        tick = () => {
          r(null);
          clearTimeout(timer);
        };
      });
    }
    ready = true;
    update();
  } else ready = true;
}

async function scheduler(interval: number, ...fn: Function[]) {
  fn.forEach((f) => f());
  setTimeout(() => scheduler(interval, ...fn), interval);
}

init();

function errorHandler(err: ErrorLike) {
  show({
    text: "",
    alt: "err",
    tooltip: `${err}`,
    class: "err",
  });
}
if (!DEBUG) {
  process.addListener("uncaughtException", errorHandler);
  // @ts-ignore
  process.addListener("unhandledRejection", errorHandler);
}
