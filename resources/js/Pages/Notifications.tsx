import { ArrowLeft, Bell, CheckCircle2, AlertTriangle, Info, Clock } from 'lucide-react'

const dummyNotifications = [
  {
    id: 1,
    type: 'success',
    title: 'OCR Recognition Successful',
    message: 'Roll R-2026-0813-001 has been successfully identified with weight 1,025 kg.',
    time: '2 minutes ago',
    unread: true
  },
  {
    id: 2,
    type: 'warning',
    title: 'Warehouse Near Capacity',
    message: 'Warehouse Sector B is currently at 92% occupancy. Consider allocating upcoming rolls to Sector C.',
    time: '1 hour ago',
    unread: true
  },
  {
    id: 3,
    type: 'info',
    title: 'System Update Completed',
    message: 'ROLLYN system has been updated to version 1.0.0. All services are running normally.',
    time: '3 hours ago',
    unread: false
  },
  {
    id: 4,
    type: 'error',
    title: 'OCR Camera Disconnected',
    message: 'Camera feed from Scale Station 2 was lost. Administrator intervention required.',
    time: 'Yesterday at 14:30',
    unread: false
  },
  {
    id: 5,
    type: 'success',
    title: 'JOP Target Reached',
    message: 'Job Order JOP-08-26-004 has reached its target of 120 rolls.',
    time: 'Aug 11, 2026',
    unread: false
  }
]

export default function Notifications() {
  function getIcon(type: string) {
    switch(type) {
      case 'success': return <CheckCircle2 size={18} className="text-green-600" />
      case 'warning': return <AlertTriangle size={18} className="text-amber-500" />
      case 'error': return <AlertTriangle size={18} className="text-red-600" />
      case 'info': default: return <Info size={18} className="text-blue-600" />
    }
  }

  return (
    <div className="py-4 px-2.5 sm:px-6 max-w-3xl mx-auto space-y-4 min-h-[80vh]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => window.history.back()} 
          className="p-2 rounded-lg hover:bg-slate-200 bg-slate-100 text-slate-700 transition-colors cursor-pointer"
          title="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell size={22} className="text-blue-700" />
            System Notifications
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Alerts, updates, and operational messages</p>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {dummyNotifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Bell size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium">No notifications right now.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {dummyNotifications.map(notif => (
              <div 
                key={notif.id} 
                className={`p-4 sm:p-5 flex gap-3.5 transition-colors hover:bg-slate-50 ${notif.unread ? 'bg-blue-50/30' : ''}`}
              >
                <div className="mt-0.5 shrink-0">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-sm font-bold ${notif.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                      {notif.title}
                    </h4>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0 mt-0.5">
                      <Clock size={11} /> {notif.time}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${notif.unread ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                    {notif.message}
                  </p>
                </div>
                {notif.unread && (
                  <div className="shrink-0 flex items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
