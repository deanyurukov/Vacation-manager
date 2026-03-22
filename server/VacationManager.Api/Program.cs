using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using VacationManager.Api.Extensions;
using VacationManager.Api.Infrastructure;
using VacationManager.Api.Seed;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<MongoDbSettings>(builder.Configuration.GetSection(MongoDbSettings.SectionName));
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<FileStorageOptions>(builder.Configuration.GetSection(FileStorageOptions.SectionName));

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
                 ?? throw new InvalidOperationException("JWT options are missing.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Secret))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddHttpContextAccessor();

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (corsOrigins is null || corsOrigins.Length == 0)
{
    corsOrigins =
    [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ];
}

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .SetPreflightMaxAge(TimeSpan.FromHours(1));
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddApplicationServices();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

// Routing + CORS must run before HTTPS redirection; otherwise OPTIONS preflight to http://localhost:5000
// gets a redirect response without Access-Control-Allow-Origin.
app.UseRouting();
app.UseCors();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await app.Services.SeedAsync(builder.Configuration);

if (Environment.GetCommandLineArgs().Any(a => a == "--seed-demo"))
{
    await MongoSeeder.EnsureDemoDataAsync(app.Services);
    Console.WriteLine("Demo data seeded.");
    Console.WriteLine("  demo_lead / Demo123!        (team lead)");
    Console.WriteLine("  demo_dev1 / Demo123!        (developer)");
    Console.WriteLine("  demo_dev2 / Demo123!        (developer)");
    Console.WriteLine("  demo_unassigned / Demo123!  (unassigned)");
    Console.WriteLine("Also created: projects \"Demo — Mobile App\", \"Demo — Billing API\"; teams \"Squad Alpha\", \"Squad Beta\"; role \"QA\"; and sample holidays.");
    return;
}

app.Run();
