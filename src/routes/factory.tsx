import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import { FactoryPage } from "@/components/factory/FactoryPage";
export const factoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/factory",
  component: FactoryPage,
});
