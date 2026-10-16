using Microsoft.EntityFrameworkCore;
using WashGOApi.Data;

namespace WashGOApi.Services;

public static class RatingCalculator
{
    public static async Task RecalcRiderAsync(AppDbContext db, string riderId)
    {
        var avg = await db.Reviews
            .Where(r => r.RiderId == riderId && !r.IsHidden)
            .AverageAsync(r => (decimal?)r.Rating);

        var rider = await db.Users.Include(u => u.RiderProfile).FirstOrDefaultAsync(u => u.Id == riderId);
        if (rider?.RiderProfile is null) return;

        rider.RiderProfile.Rating = avg is null ? 0 : Math.Round(avg.Value, 2);
        await db.SaveChangesAsync();
    }
}