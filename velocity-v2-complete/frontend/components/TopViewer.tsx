import React, { useMemo, useState, useEffect } from 'react';
import ReactFlow, { Controls, Background, useNodesState, useEdgesState, MiniMap, BackgroundVariant } from 'reactflow';
import 'reactflow/dist/style.css';
import { useWebSocket } from '../hooks/useWebSocket';

interface TopViewerProps {
  onClose?: () => void;
  embedded?: boolean;
}

const TopViewer: React.FC<TopViewerProps> = ({ onClose, embedded = false }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [scanning, setScanning] = useState(false);
  const [subnet, setSubnet] = useState('192.168.1.0/24');
  const [knownSubnets, setKnownSubnets] = useState<string[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [sshCreds, setSshCreds] = useState({ username: '', password: '', port: 22 });
  const [savedMaps, setSavedMaps] = useState<any[]>([]);
  const { socket } = useWebSocket();

  useEffect(() => {
    loadSavedMaps();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('topology-discovered-device', (data: any) => {
      setNodes(data.topology.nodes);
      setEdges(data.topology.edges);
    });

    socket.on('topology-complete', (data: any) => {
      const { topology, subnet: completedSubnet } = data;
      setNodes(topology.nodes);
      setEdges(topology.edges);
      setKnownSubnets((prev) => Array.from(new Set([...prev, completedSubnet])));
      setScanning(false);
      setProgress({ current: 0, total: 0 });
    });

    socket.on('topology-progress', (data: any) => {
      setProgress({ current: data.progress, total: data.total });
    });

    return () => {
      socket.off('topology-discovered-device');
      socket.off('topology-complete');
      socket.off('topology-progress');
    };
  }, [socket]);

  const handleScan = async () => {
    setScanning(true);
    setProgress({ current: 0, total: 0 });

    try {
      const response = await fetch('http://localhost:8080/api/v1/topology/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subnet })
      });

      if (!response.ok) throw new Error('Scan failed');
    } catch (error: any) {
      setScanning(false);
      alert('Scan failed: ' + error.message);
    }
  };

  const handleProbe = async () => {
    if (!selectedNode) return;
    const response = await fetch('http://localhost:8080/api/v1/topology/ssh-probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: selectedNode.data.ip, ...sshCreds })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      alert(err.message || 'SSH probe failed');
      return;
    }

    const metadata = await response.json();
    setNodes((prev) => prev.map((node: any) => node.id === selectedNode.id
      ? { ...node, data: { ...node.data, ...metadata } }
      : node));
  };

  const saveMap = async () => {
    const name = window.prompt('Map name', `Topology ${new Date().toLocaleString()}`);
    if (!name) return;

    const response = await fetch('http://localhost:8080/api/v1/topology/maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, subnet, topology: { nodes, edges } })
    });

    if (response.ok) {
      await loadSavedMaps();
    }
  };

  const loadSavedMaps = async () => {
    const response = await fetch('http://localhost:8080/api/v1/topology/maps');
    if (!response.ok) return;
    const maps = await response.json();
    setSavedMaps(maps);
  };

  const loadMap = (map: any) => {
    setNodes(map.Topology?.nodes || []);
    setEdges(map.Topology?.edges || []);
    if (map.Subnet) setSubnet(map.Subnet);
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  const canvas = useMemo(() => {
    if (viewMode === '2d') {
      return (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => setSelectedNode(node)}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
          <Controls className="bg-slate-800 border border-slate-700" />
          <MiniMap className="bg-slate-800 border border-slate-700" />
        </ReactFlow>
      );
    }

    return (
      <div className="h-full overflow-auto perspective-[1000px] p-8">
        <div className="relative min-h-[600px] bg-slate-900 rounded-xl border border-slate-700">
          {nodes.map((node: any, index) => (
            <button
              key={node.id}
              onClick={() => setSelectedNode(node)}
              className="absolute w-32 h-16 bg-indigo-600/80 border border-indigo-300 text-xs rounded-lg text-white shadow-lg"
              style={{ left: `${80 + ((index % 6) * 180)}px`, top: `${80 + (Math.floor(index / 6) * 120)}px`, transform: `translateZ(${node.data?.z || 20}px)` }}
            >
              <div className="font-semibold truncate">{node.data?.hostname}</div>
              <div>{node.data?.ip}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }, [viewMode, nodes, edges, onNodesChange, onEdgesChange]);

  const wrapperClasses = embedded ? 'h-full flex flex-col rounded-xl overflow-hidden border border-slate-700 bg-slate-900' : 'fixed inset-0 bg-slate-900 z-50 flex flex-col';

  return (
    <div className={wrapperClasses}>
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-4 flex justify-between items-center shadow-lg">
        <h2 className="text-2xl font-bold text-white">Topology Viewer</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode(viewMode === '2d' ? '3d' : '2d')} className="px-3 py-1 rounded bg-slate-700 text-white">{viewMode.toUpperCase()}</button>
          {!embedded && onClose && <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">✕</button>}
        </div>
      </div>

      <div className="bg-slate-800 border-b border-slate-700 p-4 flex gap-3 items-center">
        <input value={subnet} onChange={(e) => setSubnet(e.target.value)} disabled={scanning} className="flex-1 bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white" />
        <button onClick={handleScan} disabled={scanning} className="px-6 py-2 bg-blue-600 text-white rounded">{scanning ? `Scanning ${progressPercent}%` : 'Scan Subnet'}</button>
        <button onClick={saveMap} className="px-4 py-2 bg-emerald-600 text-white rounded">Save Map</button>
      </div>

      <div className="grid grid-cols-12 gap-0 flex-1 min-h-0">
        <div className="col-span-9 bg-slate-950">{canvas}</div>
        <div className="col-span-3 border-l border-slate-700 bg-slate-900 p-4 overflow-auto space-y-4">
          <div>
            <h3 className="text-white font-semibold mb-2">Scanned subnets</h3>
            {knownSubnets.length === 0 ? <p className="text-slate-500 text-sm">None yet</p> : knownSubnets.map((s) => <div className="text-sm text-slate-300" key={s}>{s}</div>)}
          </div>

          <div>
            <h3 className="text-white font-semibold mb-2">Saved maps</h3>
            <div className="space-y-2">
              {savedMaps.slice(0, 6).map((map) => (
                <button key={map.ID} onClick={() => loadMap(map)} className="w-full text-left bg-slate-800 hover:bg-slate-700 rounded px-2 py-1 text-sm text-slate-300">{map.Name}</button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-2">Device actions</h3>
            {!selectedNode ? <p className="text-slate-500 text-sm">Select a node to run SSH probe.</p> : (
              <div className="space-y-2 text-sm">
                <div className="text-slate-200">{selectedNode.data?.ip}</div>
                <input placeholder="username" value={sshCreds.username} onChange={(e) => setSshCreds((p) => ({ ...p, username: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white" />
                <input type="password" placeholder="password" value={sshCreds.password} onChange={(e) => setSshCreds((p) => ({ ...p, password: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white" />
                <button onClick={handleProbe} className="w-full px-3 py-2 bg-indigo-600 rounded text-white">SSH Connect & Detect</button>
                <div className="text-slate-300">Vendor: {selectedNode.data?.vendor || 'Unknown'}</div>
                <div className="text-slate-300">Model: {selectedNode.data?.model || 'Unknown'}</div>
                <div className="text-slate-300">Hostname: {selectedNode.data?.hostname}</div>
                <div className="text-slate-300">IP: {selectedNode.data?.ip}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopViewer;
