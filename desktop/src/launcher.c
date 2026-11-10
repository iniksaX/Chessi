/* Chessi launcher for Windows — single-file build.
 *
 * The chess app (a single self-contained HTML file, ~4 MB) is appended to
 * this executable as an overlay:
 *
 *     [ PE image ][ chessi.html bytes ][ uint64 LE html length ][ 8-byte magic ]
 *
 * On launch the stub extracts the embedded HTML to %TEMP%\Chessi\ and opens
 * it with the user's default browser (file://). No installation, no network,
 * no registry writes, no DLL dependencies beyond Windows itself.
 *
 * Build: zig cc -target x86_64-windows-gnu -O2 -municode launcher.c -o Chessi.exe -lshell32 -Wl,/subsystem:windows
 * Then:  python3 make_portable.py  (appends dist/index.html + length + magic)
 */
#include <windows.h>
#include <shellapi.h>
#include <wchar.h>
#include <stdio.h>

#define MAGIC "CHESSI01"
#define MAGIC_LEN 8
#define TAIL_LEN (sizeof(unsigned long long) + MAGIC_LEN)

static void read_self_path(wchar_t *out, DWORD cap) {
    DWORD n = GetModuleFileNameW(NULL, out, cap);
    if (n == 0 || n >= cap) { out[0] = L'\0'; }
}

int WINAPI wWinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance,
                    PWSTR lpCmdLine, int nShowCmd) {
    (void)hInstance; (void)hPrevInstance; (void)lpCmdLine; (void)nShowCmd;

    wchar_t selfPath[MAX_PATH];
    read_self_path(selfPath, MAX_PATH);
    if (selfPath[0] == L'\0') return 1;

    /* ---- locate embedded payload at end of this file ---- */
    unsigned char tail[TAIL_LEN];
    HANDLE hSelf = CreateFileW(selfPath, GENERIC_READ, FILE_SHARE_READ,
                               NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
    if (hSelf == INVALID_HANDLE_VALUE) return 1;
    LARGE_INTEGER size;
    if (!GetFileSizeEx(hSelf, &size)) { CloseHandle(hSelf); return 1; }
    SetFilePointerEx(hSelf, (LARGE_INTEGER){.QuadPart = size.QuadPart - TAIL_LEN}, NULL, FILE_BEGIN);
    DWORD got = 0;
    if (!ReadFile(hSelf, tail, TAIL_LEN, &got, NULL) || got != TAIL_LEN) { CloseHandle(hSelf); return 1; }
    if (memcmp(tail + 8, MAGIC, MAGIC_LEN) != 0) {
        /* Not an embedded build: fall back to chessi.html next to the exe */
        CloseHandle(hSelf);
        wchar_t *slash = wcsrchr(selfPath, L'\\');
        if (!slash) return 1;
        *slash = L'\0';
        wchar_t htmlPath[MAX_PATH];
        wsprintfW(htmlPath, L"%s\\chessi.html", selfPath);
        if (GetFileAttributesW(htmlPath) == INVALID_FILE_ATTRIBUTES) {
            MessageBoxW(NULL, L"chessi.html was not found next to Chessi.exe and no embedded app was found.",
                        L"Chessi", MB_ICONERROR | MB_OK);
            return 1;
        }
        SHELLEXECUTEINFOW sei = { sizeof(sei) };
        sei.lpVerb = L"open"; sei.lpFile = htmlPath; sei.nShow = SW_SHOWNORMAL;
        if (!ShellExecuteExW(&sei)) {
            MessageBoxW(NULL, L"Could not open your default browser.", L"Chessi", MB_ICONERROR | MB_OK);
            return 1;
        }
        return 0;
    }
    unsigned long long htmlLen = 0;
    for (int i = 7; i >= 0; --i) htmlLen = (htmlLen << 8) | tail[i];

    if ((unsigned long long)size.QuadPart < htmlLen + TAIL_LEN) { CloseHandle(hSelf); return 1; }

    /* ---- extract to %TEMP%\Chessi\chessi.html ---- */
    wchar_t tempDir[MAX_PATH];
    DWORD t = GetTempPathW(MAX_PATH, tempDir);
    if (t == 0 || t >= MAX_PATH) return 1;
    wchar_t chessiDir[MAX_PATH];
    wsprintfW(chessiDir, L"%sChessi", tempDir);
    CreateDirectoryW(chessiDir, NULL); /* ok if exists */
    wchar_t htmlPath[MAX_PATH];
    wsprintfW(htmlPath, L"%s\\chessi-1.0.0.html", chessiDir);

    HANDLE hOut = CreateFileW(htmlPath, GENERIC_WRITE, 0, NULL,
                              CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
    if (hOut == INVALID_HANDLE_VALUE) { CloseHandle(hSelf); return 1; }

    SetFilePointerEx(hSelf, (LARGE_INTEGER){.QuadPart = size.QuadPart - TAIL_LEN - htmlLen}, NULL, FILE_BEGIN);
    unsigned char buf[65536];
    unsigned long long left = htmlLen;
    while (left) {
        DWORD want = (DWORD)(left > sizeof(buf) ? sizeof(buf) : left);
        DWORD r = 0, w = 0;
        if (!ReadFile(hSelf, buf, want, &r, NULL) || r == 0) { CloseHandle(hSelf); CloseHandle(hOut); return 1; }
        if (!WriteFile(hOut, buf, r, &w, NULL) || w != r) { CloseHandle(hSelf); CloseHandle(hOut); return 1; }
        left -= r;
    }
    CloseHandle(hOut);
    CloseHandle(hSelf);

    /* ---- open in the default browser ---- */
    SHELLEXECUTEINFOW sei = { sizeof(sei) };
    sei.lpVerb = L"open";
    sei.lpFile = htmlPath;
    sei.nShow = SW_SHOWNORMAL;
    if (!ShellExecuteExW(&sei)) {
        MessageBoxW(NULL, L"Extracted chessi.html but could not open your browser.\nOpen the file manually from your Temp folder.",
                    L"Chessi", MB_ICONERROR | MB_OK);
        return 1;
    }
    return 0;
}
