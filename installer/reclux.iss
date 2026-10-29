; Reclux guided installer for Windows (Chrome, Brave, Edge, Opera).
; It copies the extension to the user's AppData and opens a short guide in each chosen browser.
; Browsers do not let a program add an extension by itself, so the user clicks "Load unpacked" once.
; Build: npm run installer   (needs Inno Setup 6)

#define AppVersion "0.1.0"

[Setup]
AppId={{8D3A6C1E-2B7F-4C55-9A31-7E0F5B2C9D40}
AppName=Reclux
AppVersion={#AppVersion}
AppVerName=Reclux {#AppVersion}
AppPublisher=Aakash Prajapati
AppPublisherURL=https://iamaakashoza.github.io/reclux-install/
AppSupportURL=https://github.com/iamaakashoza/reclux
; A fixed folder keeps the extension's identity the same across updates, so saved settings survive.
DefaultDirName={localappdata}\Reclux
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\.output
OutputBaseFilename=Reclux-Setup-{#AppVersion}
SetupIconFile=reclux.ico
UninstallDisplayIcon={app}\reclux.ico
UninstallDisplayName=Reclux screen recorder
WizardStyle=modern
Compression=lzma2
SolidCompression=yes

[Messages]
WelcomeLabel2=This copies Reclux to your computer. Then you add it to Chrome, Brave, Edge or Opera in four quick steps.%n%nNo account. No upload. Works offline.
FinishedHeadingLabel=Reclux is on your computer
FinishedLabel=Pick your browsers below and click Finish. Each one opens a short guide to add Reclux (about 30 seconds).%n%nYou can open the guide again from the Start menu: "Reclux setup guide".

[InstallDelete]
; Remove the old version first: file names change between versions.
Type: filesandordirs; Name: "{app}\extension"

[Files]
Source: "..\.output\chrome-mv3\*"; DestDir: "{app}\extension"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "install-guide.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "reclux.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{userprograms}\Reclux setup guide"; Filename: "{app}\install-guide.html"; IconFilename: "{app}\reclux.ico"

[Run]
Filename: "{code:BrowserExe|chrome}"; Parameters: """{app}\install-guide.html"""; Description: "Open the guide in Google Chrome"; Flags: postinstall nowait skipifsilent; Check: HasBrowser('chrome')
Filename: "{code:BrowserExe|brave}"; Parameters: """{app}\install-guide.html"""; Description: "Open the guide in Brave"; Flags: postinstall nowait skipifsilent; Check: HasBrowser('brave')
Filename: "{code:BrowserExe|edge}"; Parameters: """{app}\install-guide.html"""; Description: "Open the guide in Microsoft Edge"; Flags: postinstall nowait skipifsilent unchecked; Check: HasBrowser('edge')
Filename: "{code:BrowserExe|opera}"; Parameters: """{app}\install-guide.html"""; Description: "Open the guide in Opera"; Flags: postinstall nowait skipifsilent unchecked; Check: HasBrowser('opera')

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Code]
// Look for a browser: first where Windows registers it, then its usual install folders.
function FindExe(const Name, Fallback1, Fallback2: String): String;
var
  P: String;
begin
  Result := '';
  if RegQueryStringValue(HKCU, 'SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\' + Name, '', P) and FileExists(P) then
  begin
    Result := P;
    exit;
  end;
  if RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\' + Name, '', P) and FileExists(P) then
  begin
    Result := P;
    exit;
  end;
  if FileExists(ExpandConstant(Fallback1)) then
  begin
    Result := ExpandConstant(Fallback1);
    exit;
  end;
  if FileExists(ExpandConstant(Fallback2)) then
    Result := ExpandConstant(Fallback2);
end;

function BrowserExe(Param: String): String;
begin
  if Param = 'chrome' then
    Result := FindExe('chrome.exe', '{commonpf}\Google\Chrome\Application\chrome.exe', '{localappdata}\Google\Chrome\Application\chrome.exe')
  else if Param = 'brave' then
    Result := FindExe('brave.exe', '{commonpf}\BraveSoftware\Brave-Browser\Application\brave.exe', '{localappdata}\BraveSoftware\Brave-Browser\Application\brave.exe')
  else if Param = 'edge' then
    Result := FindExe('msedge.exe', '{commonpf32}\Microsoft\Edge\Application\msedge.exe', '{commonpf}\Microsoft\Edge\Application\msedge.exe')
  else if Param = 'opera' then
    Result := FindExe('opera.exe', '{localappdata}\Programs\Opera\opera.exe', '{commonpf}\Opera\opera.exe')
  else
    Result := '';
end;

function HasBrowser(Name: String): Boolean;
begin
  Result := BrowserExe(Name) <> '';
end;
