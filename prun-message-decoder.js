const ENGINE_IO_PACKET_TYPE = {
  0: 'open', 1: 'close', 2: 'ping', 3: 'pong', 4: 'message', 5: 'upgrade', 6: 'noop'
};
const ENGINE_IO_SEPARATOR = String.fromCharCode(30);

function decodeEngineIOPayload(encodedPayload) {
  if (typeof encodedPayload !== 'string') return [];
  const encodedPackets = encodedPayload.split(ENGINE_IO_SEPARATOR);
  const packets = [];
  for (let i = 0; i < encodedPackets.length; i++) {
    const encodedPacket = encodedPackets[i];
    if (!encodedPacket) continue;
    const typeChar = encodedPacket.charAt(0);
    const type = Number(typeChar);
    const data = encodedPacket.substring(1);
    if (ENGINE_IO_PACKET_TYPE[type] === 'message') {
      packets.push({ type: 'message', data: data });
    } else {
      packets.push({ type: ENGINE_IO_PACKET_TYPE[type] || 'unknown', data: data });
    }
  }
  return packets;
}

const SOCKET_IO_PACKET_TYPE = { EVENT: 2 };

function decodeSocketIOPacket(encodedPacket) {
  try {
    if (typeof encodedPacket !== 'string' || encodedPacket.length === 0) return undefined;
    let i = 0;
    const packetType = Number(encodedPacket.charAt(0));
    if (packetType !== SOCKET_IO_PACKET_TYPE.EVENT) return undefined;
    i++;
    if (encodedPacket.charAt(i) === '/') {
      while (i < encodedPacket.length && encodedPacket.charAt(i) !== ',') i++;
      if (encodedPacket.charAt(i) === ',') i++;
    }
    const nextChar = encodedPacket.charAt(i);
    if (nextChar !== '' && !isNaN(Number(nextChar))) {
      while (i < encodedPacket.length && !isNaN(Number(encodedPacket.charAt(i)))) i++;
    }
    const jsonDataString = encodedPacket.substring(i);
    const data = JSON.parse(jsonDataString);
    if (Array.isArray(data) && data.length >= 2) {
      return { type: packetType, eventName: data[0], payload: data[1] };
    }
    return undefined;
  } catch (e) {
    console.error('[PrUn Decoder] Error decoding packet');
    return undefined;
  }
}

window.PrUnDecoder = Object.freeze({
  getPayload(rawMessage) {
    if (typeof rawMessage !== 'string') return undefined;
    const engineIOPackets = decodeEngineIOPayload(rawMessage);
    for (let i = 0; i < engineIOPackets.length; i++) {
      const pkt = engineIOPackets[i];
      if (pkt.type === 'message' && pkt.data) {
        const socketIOPacket = decodeSocketIOPacket(pkt.data);
        if (socketIOPacket?.type === SOCKET_IO_PACKET_TYPE.EVENT) return socketIOPacket.payload;
      }
    }
    return undefined;
  }
});
