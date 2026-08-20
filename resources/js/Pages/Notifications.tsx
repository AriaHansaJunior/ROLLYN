import { useState } from 'react'
import { ArrowLeft, Bell, CheckCircle2, AlertTriangle, Info, Clock, CheckCheck, Package, Download } from 'lucide-react'
import { router } from '@inertiajs/react'

interface NotificationItem {
  id: number
  type: string
  title: string
  message: string
  time: string
  unread: boolean
}

interface Props {
  notifications: NotificationItem[]
}

export default function Notifications({ notifications = [] }: Props) {
  const [filter, setFilter] = useState('all')

  function getIcon(type: string) {
    switch(type.toLowerCase()) {
      case 'incoming': return <Package size={18} className="text-green-600" />
      case 'shipment': return <CheckCircle2 size={18} className="text-blue-600" />
      case 'warning': return <AlertTriangle size={18} className="text-amber-500" />
      case 'error': return <AlertTriangle size={18} className="text-red-600" />
      default: return <Info size={18} className="text-blue-600" />
    }
  }

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true
    return notif.type.toLowerCase() === filter.toLowerCase()
  })

  function markAllRead() {
    router.post('/notifications/read-all')
  }

  return (
    <div className="py-4 px-2.5 sm:px-6 max-w-3xl mx-auto space-y-4 min-h-[80vh]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
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
        
        <button
          onClick={markAllRead}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
        >
          <CheckCheck size={14} />
          Mark all as read
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['All', 'Incoming', 'Shipment', 'Warning'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab.toLowerCase())}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              filter === tab.toLowerCase()
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Bell size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium">No notifications right now.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map(notif => (
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
