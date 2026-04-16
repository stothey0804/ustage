declare global {
  interface Window {
    daum: {
      Postcode: new (opts: {
        oncomplete: (data: {
          address: string;
          roadAddress: string;
          jibunAddress: string;
          zonecode: string;
          buildingName: string;
        }) => void;
      }) => { open: () => void };
    };
    kakao: {
      maps: {
        load: (cb: () => void) => void;
        Map: new (
          el: HTMLElement,
          opts: { center: unknown; level: number }
        ) => unknown;
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (opts: { position: unknown }) => {
          setMap: (map: unknown) => void;
        };
        InfoWindow: new (opts: { content: string }) => {
          open: (map: unknown, marker: unknown) => void;
        };
        services: {
          Geocoder: new () => {
            addressSearch: (
              addr: string,
              cb: (
                result: Array<{ x: string; y: string }>,
                status: string
              ) => void
            ) => void;
          };
          Status: { OK: string };
        };
      };
    };
  }
}

export {};
