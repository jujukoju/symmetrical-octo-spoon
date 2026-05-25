import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const NINRegistryModule = buildModule("NINRegistryModule", (m) => {
  const registry = m.contract("NINRegistry");

  return { registry };
});

export default NINRegistryModule;