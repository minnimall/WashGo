using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace WashGOApi.Services;

// Hub นี้ "รับฟังอย่างเดียว" ไม่มีเมธอดให้ client เรียก ข้อความทั้งหมดส่งผ่าน ChatController
[Authorize]
public class ChatHub : Hub
{
    public static string UserGroup(string userId) => $"user-{userId}";

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst("sub")?.Value;
        if (userId is null)
        {
            Context.Abort();
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(userId));
        await base.OnConnectedAsync();
    }
}