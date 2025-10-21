import { useEffect, useState } from 'react';
import { getAll } from './db';
import { format } from 'date-fns';

export default function WhatsAppLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const load = async () => {
      const l = await getAll('WhatsApp_Logs');
      setLogs(l.reverse());
    };
    load();
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      <h2 className="text-xl font-semibold mb-4">WhatsApp Messages</h2>
      <div className="space-y-3">
        {logs.length === 0 && <div className="text-slate-500 text-sm">No messages sent yet.</div>}
        {logs.map((log) => (
          <div key={log.id} className="p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <div className="text-slate-600">To: +{log.to}</div>
              <div className="text-slate-500">{format(new Date(log.date), 'd MMM, h:mm a')}</div>
            </div>
            <div className="mt-1 text-slate-900">{log.message}</div>
            <div className="mt-1 text-xs text-slate-500">Context: {log.context} • Status: {log.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
