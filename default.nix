{ mkBunDerivation, ... }:
mkBunDerivation {
  pname = "scope";
  version = "1.0.0";

  src = ./.;

  bunNix = ./bun.nix;

  index = "index.ts";
}