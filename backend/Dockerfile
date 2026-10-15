FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY WashGOApi.csproj ./
RUN dotnet restore
COPY . ./
RUN dotnet publish WashGOApi.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish ./
# Render ส่งพอร์ตมาทางตัวแปร PORT (ค่าเริ่มต้น 10000) ต้องฟังที่ 0.0.0.0
CMD ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-10000} exec dotnet WashGOApi.dll"]