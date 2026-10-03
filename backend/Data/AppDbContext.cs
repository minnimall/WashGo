using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using WashGOApi.Models;

namespace WashGOApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<RiderProfile> RiderProfiles => Set<RiderProfile>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<ServiceType> ServiceTypes => Set<ServiceType>();
    public DbSet<ServicePrice> ServicePrices => Set<ServicePrice>();
    public DbSet<Order> Orders => Set<Order>();

    protected override void ConfigureConventions(ModelConfigurationBuilder c)
    {
        c.Properties<decimal>().HavePrecision(10, 2);   // เงินทุกช่องทศนิยม 2 ตำแหน่ง
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<RiderProfile>(e =>
        {
            e.HasKey(r => r.UserId);
            e.HasOne(r => r.User).WithOne(u => u.RiderProfile)
             .HasForeignKey<RiderProfile>(r => r.UserId);
            e.Property(r => r.VerificationStatus).HasConversion<string>().HasMaxLength(30);
        });

        b.Entity<Location>(e =>
        {
            e.HasOne(l => l.User).WithMany().HasForeignKey(l => l.UserId);
        });

        b.Entity<ServiceType>(e =>
        {
            e.HasIndex(s => s.Code).IsUnique();
        });

        b.Entity<ServicePrice>(e =>
        {
            e.Property(p => p.Size).HasConversion<string>().HasMaxLength(5);
            e.HasIndex(p => new { p.ServiceTypeId, p.Size }).IsUnique();
            e.HasOne(p => p.ServiceType).WithMany(s => s.Prices)
             .HasForeignKey(p => p.ServiceTypeId);
        });

        b.Entity<Order>(e =>
        {
            e.HasIndex(o => o.OrderNo).IsUnique();
            e.Property(o => o.Version).IsRowVersion();
            e.Property(o => o.Status).HasConversion<string>().HasMaxLength(40);
            e.Property(o => o.EstimatedSize).HasConversion<string>().HasMaxLength(5);
            e.Property(o => o.FinalSize).HasConversion<string>().HasMaxLength(5);
            e.Property(o => o.DetergentSource).HasConversion<string>().HasMaxLength(20);

            // Order มี FK ไป user/location หลายเส้น ใช้ Restrict กัน cascade ซ้อนกัน
            e.HasOne(o => o.Customer).WithMany().HasForeignKey(o => o.CustomerId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(o => o.Rider).WithMany().HasForeignKey(o => o.RiderId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(o => o.ServiceType).WithMany().HasForeignKey(o => o.ServiceTypeId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(o => o.PickupLocation).WithMany().HasForeignKey(o => o.PickupLocationId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(o => o.DeliveryLocation).WithMany().HasForeignKey(o => o.DeliveryLocationId)
             .OnDelete(DeleteBehavior.Restrict);
        });
    }
}