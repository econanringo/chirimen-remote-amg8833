import nodeWebSocketLib from "websocket"; 
import { RelayServer } from "./RelayServer.js";
import { requestI2CAccess } from "node-web-i2c";

const AMG88xx_ADDRESS = 0x69; // AMG8833 default address

async function connect() {
  // I2C初期化
  const i2cAccess = await requestI2CAccess();
  const port = i2cAccess.ports.get(1); // I2C1
  const amg8833 = new AMG8833(port, AMG88xx_ADDRESS);
  await amg8833.init();

  // WebSocketリレー接続
  const relay = RelayServer("chirimentest", "chirimenSocket", nodeWebSocketLib, "https://chirimen.org");
  const channel = await relay.subscribe("amg8833_thermo");
  console.log("WebSocketリレーサービスに接続しました");

  setInterval(async () => {
    const pixels = await amg8833.readPixels();
    channel.send(JSON.stringify(pixels));
  }, 500);
}

class AMG8833 {
  constructor(port, address) {
    this.i2cPort = port;
    this.address = address;
  }

  async init() {
    this.i2cSlave = await this.i2cPort.open(this.address);
    await this.i2cSlave.write8(0x00, 0x00); // Power control normal mode
  }

  async readPixels() {
    const rawData = await this.i2cSlave.readBytes(0x80, 128);
    let pixels = [];
    for (let i = 0; i < 64; i++) {
      let temp = rawData[i * 2] + (rawData[i * 2 + 1] << 8);
      if (temp & 0x0800) temp |= 0xF000;
      temp *= 0.25;
      pixels.push(temp);
    }
    return pixels;
  }
}

connect();