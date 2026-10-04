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
    public DbSet<CatalogItem> CatalogItems => Set<CatalogItem>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();
    public DbSet<OrderLine> OrderLines => Set<OrderLine>();
    public DbSet<OrderImage> OrderImages => Set<OrderImage>();
    public DbSet<OrderStatusHistory> OrderStatusHistories => Set<OrderStatusHistory>();

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

        b.Entity<CatalogItem>(e =>
        {
            e.Property(c => c.Type).HasConversion<string>().HasMaxLength(10);
            e.Property(c => c.Name).HasMaxLength(100);
        });

        b.Entity<AppSetting>(e =>
        {
            e.HasKey(s => s.Key);
            e.Property(s => s.Key).HasMaxLength(100);
            e.Property(s => s.Value).HasMaxLength(500);
        });

        b.Entity<OrderLine>(e =>
        {
            e.Property(l => l.Type).HasConversion<string>().HasMaxLength(10);
            e.Property(l => l.Name).HasMaxLength(100);
            e.HasOne(l => l.Order).WithMany(o => o.Lines)
             .HasForeignKey(l => l.OrderId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(l => l.CatalogItem).WithMany()
             .HasForeignKey(l => l.CatalogItemId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<OrderImage>(e =>
        {
            e.Property(i => i.Type).HasConversion<string>().HasMaxLength(20);
            e.Property(i => i.ImagePath).HasMaxLength(500);
            e.HasOne(i => i.Order).WithMany(o => o.Images)
             .HasForeignKey(i => i.OrderId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(i => i.UploadedBy).WithMany()
             .HasForeignKey(i => i.UploadedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<OrderStatusHistory>(e =>
        {
            e.Property(h => h.FromStatus).HasConversion<string>().HasMaxLength(40);
            e.Property(h => h.ToStatus).HasConversion<string>().HasMaxLength(40);
            e.Property(h => h.Note).HasMaxLength(500);
            e.HasIndex(h => new { h.OrderId, h.CreatedAt });
            e.HasOne(h => h.Order).WithMany(o => o.StatusHistories)
             .HasForeignKey(h => h.OrderId).OnDelete(DeleteBehavior.Cascade);
            // ประวัติเป็นหลักฐาน ลบผู้ใช้แล้วต้องไม่พาประวัติหายตาม จึงใช้ Restrict
            e.HasOne(h => h.ChangedBy).WithMany()
             .HasForeignKey(h => h.ChangedByUserId).OnDelete(DeleteBehavior.Restrict);
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