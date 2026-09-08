// Deterministic official-protocol fixture: no network, credentials or AI usage.
const readline = require('node:readline');
const fs = require('node:fs');
const path = require('node:path');
const send = packet => process.stdout.write(JSON.stringify(packet) + '\n');
const args = process.argv.slice(2);
if (args.includes('login')) { console.log('Login oficial simulado concluído.'); process.exit(0); }
let promptId;
const codex = args.includes('app-server');
const grok = args.includes('agent');
const done = () => {
  fs.writeFileSync(path.join(process.cwd(), 'native-agent-result.txt'), 'Alteração autorizada de teste.');
  if (codex) {
    send({ method: 'item/agentMessage/delta', params: { delta: 'Alteração autorizada concluída.' } });
    send({ method: 'turn/completed', params: { turn: { status: 'completed' } } });
  } else if (grok) {
    send({ method: 'session/update', params: { update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'Alteração autorizada concluída.' } } } });
    send({ id: promptId, result: { stopReason: 'end_turn' } });
  } else {
    send({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Alteração autorizada concluída.' }] }, session_id: 'fixture', uuid: 'assistant' });
    send({ type: 'result', subtype: 'success', is_error: false, result: 'Concluído', session_id: 'fixture', uuid: 'result' });
  }
};
readline.createInterface({ input: process.stdin }).on('line', line => {
  const packet = JSON.parse(line);
  if (packet.method === 'initialize') send({ id: packet.id, result: { protocolVersion: 1, agentCapabilities: {} } });
  else if (packet.method === 'account/read') send({ id: packet.id, result: { account: { type: 'chatgpt' } } });
  else if (packet.method === 'thread/start') {
    if (packet.params.approvalPolicy !== 'on-request' || packet.params.sandbox !== 'workspace-write') throw new Error('Missing sandbox');
    send({ id: packet.id, result: { thread: { id: 'thread' } } });
  } else if (packet.method === 'turn/start') {
    send({ id: packet.id, result: { turn: { id: 'turn' } } });
    if (packet.params.input[0].text === 'Aguardar cancelamento') return;
    send({ id: 'approve', method: 'item/fileChange/requestApproval', params: { reason: 'Criar arquivo de teste' } });
  } else if (packet.method === 'session/new') send({ id: packet.id, result: { sessionId: 'session' } });
  else if (packet.method === 'session/prompt') {
    promptId = packet.id;
    send({ id: 'approve', method: 'session/request_permission', params: { toolCall: { title: 'Criar arquivo de teste' }, options: [{ kind: 'allow_once', optionId: 'allow' }, { kind: 'reject_once', optionId: 'deny' }] } });
  } else if (packet.id === 'approve') {
    if (packet.result?.decision === 'accept' || packet.result?.outcome?.optionId === 'allow') done();
    else if (codex) send({ method: 'turn/completed', params: { turn: { status: 'completed' } } });
    else send({ id: promptId, result: { stopReason: 'end_turn' } });
  } else if (packet.type === 'control_request') {
    send({ type: 'control_response', response: { subtype: 'success', request_id: packet.request_id, response: { commands: [], models: [], account: {} } } });
  } else if (packet.type === 'user') {
    send({ type: 'control_request', request_id: 'approve', request: { subtype: 'can_use_tool', tool_name: 'Write', tool_use_id: 'write', input: { file_path: 'native-agent-result.txt' } } });
  } else if (packet.type === 'control_response' && packet.response.request_id === 'approve') {
    if (packet.response.response?.behavior === 'allow') done();
    else send({ type: 'result', subtype: 'success', is_error: false, result: 'Recusado', session_id: 'fixture', uuid: 'result' });
  }
});
