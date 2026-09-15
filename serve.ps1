$root = $PSScriptRoot
$port = 8000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$port"

$mime = @{
    ".html" = "text/html"; ".htm" = "text/html"; ".js" = "application/javascript"
    ".css" = "text/css"; ".json" = "application/json"; ".png" = "image/png"
    ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"; ".gif" = "image/gif"
    ".svg" = "image/svg+xml"; ".mp3" = "audio/mpeg"; ".wav" = "audio/wav"
    ".ico" = "image/x-icon"; ".woff" = "font/woff"; ".woff2" = "font/woff2"
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response
    try {
        $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
        if ($path -eq "/") { $path = "/index.html" }
        $filePath = Join-Path $root ($path.TrimStart("/"))
        $filePath = [System.IO.Path]::GetFullPath($filePath)
        if (-not $filePath.StartsWith($root)) {
            $res.StatusCode = 403
            $res.Close()
            continue
        }
        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath)
            $contentType = $mime[$ext]
            if (-not $contentType) { $contentType = "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $res.ContentType = $contentType
            $res.ContentLength64 = $bytes.Length
            # 개발 서버: 브라우저가 JS/CSS를 stale하게 캐싱해서 수정사항이 반영 안 되는 문제 방지
            $res.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate")
            $res.Headers.Add("Pragma", "no-cache")
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $res.OutputStream.Write($msg, 0, $msg.Length)
        }
    } catch {
        $res.StatusCode = 500
    } finally {
        $res.Close()
    }
}
