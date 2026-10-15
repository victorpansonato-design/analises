import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom não implementa matchMedia (tema e breakpoints usam): stub com "não casa" e ouvintes vazios.
if (typeof window !== "undefined" && !window.matchMedia) {
   Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
         matches: false,
         media: query,
         onchange: null,
         addEventListener: () => undefined,
         removeEventListener: () => undefined,
         addListener: () => undefined,
         removeListener: () => undefined,
         dispatchEvent: () => false,
      }),
   });
}

// jsdom também não tem ResizeObserver (cmdk e os gráficos medem o contêiner).
if (typeof window !== "undefined" && !("ResizeObserver" in window)) {
   class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
   }
   Object.defineProperty(window, "ResizeObserver", { writable: true, value: ResizeObserverStub });
   Object.defineProperty(globalThis, "ResizeObserver", { writable: true, value: ResizeObserverStub });
}

// cmdk rola o item selecionado para a vista.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
   Element.prototype.scrollIntoView = () => undefined;
}

afterEach(() => {
   cleanup();
});
