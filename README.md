# Scope

Scope is a waybar widget that implements other widgets in TypeScript, merging them into 1 single at-a-glance widget.

> [!WARNING]
> This is a bad implementation of widgets. It is meant to be used by me only. Please do not roast me for being bad at it or using TypeScript in the first place. Thank you.

## Usage

This is my setup, also including the hidden widgets in a group.
```nix
# home-manager waybar configuration
{
  "group/group-info" = {
    modules = [
      "custom/info"
      "pulseaudio"
      "network"
      "cpu"
      "memory"
      "battery"
      "tray"
    ];
  };
  "custom/info" = {
    exec = "bun ${./info}/bin/scope";
    restart-interval = 5;
    return-type = "json";
    on-click = "swaync-client -t";
  };
}
```

### Secondary widget

This is a Work-In-Progress widget to extend the original widget intended to be used in another expanding group to act as a cool tooltip-like thing.

## Development

A flag `--debug` is provided for convenience of debugging. This will remove unnecessary prints and switch to Past/Now logging.