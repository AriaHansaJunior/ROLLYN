<?php

namespace App\Http\Controllers;

use App\Models\SystemNotification;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index()
    {
        $notifications = SystemNotification::orderBy('created_at', 'desc')->get()->map(function ($notif) {
            return [
                'id' => $notif->id,
                'type' => $notif->type,
                'title' => $notif->title,
                'message' => $notif->message,
                'time' => $notif->created_at ? $notif->created_at->diffForHumans() : 'Just now',
                'unread' => $notif->is_unread,
            ];
        });

        return Inertia::render('Notifications', ['notifications' => $notifications]);
    }

    public function readAll()
    {
        SystemNotification::where('is_unread', true)->update(['is_unread' => false]);
        return redirect()->back()->with('success', 'All notifications marked as read.');
    }

    /**
     * Backward-compatible alias for readAll
     */
    public function readAllNotifications()
    {
        return $this->readAll();
    }
}
