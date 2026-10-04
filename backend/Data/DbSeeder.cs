using Microsoft.AspNetCore.Identity;
using WashGOApi.Models;

namespace WashGOApi.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        foreach (var role in new[] { Roles.Customer, Roles.Rider, Roles.Admin })
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        await CatalogSeeder.SeedAsync(scope.ServiceProvider.GetRequiredService<AppDbContext>());

        var email = config["Seed:AdminEmail"];
        var password = config["Seed:AdminPassword"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password)) return;
        if (await userManager.FindByEmailAsync(email) is not null) return;

        var admin = new ApplicationUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            FullName = "Administrator",
        };

        var result = await userManager.CreateAsync(admin, password);
        if (result.Succeeded) await userManager.AddToRoleAsync(admin, Roles.Admin);
    }
}