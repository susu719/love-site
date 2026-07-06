"use client";

import { useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";

export type MappableMemory = {
  id: string;
  title: string;
  content: string | null;
  memory_date: string;
  latitude: number | null;
  longitude: number | null;
  photos: {
    id: string;
    image_url: string;
    caption: string | null;
  }[];
};

type MemoryMapProps = {
  memories: MappableMemory[];
};

const markerIcon = L.divIcon({
  className: "",
  html: '<span class="block size-4 rounded-full border-2 border-white bg-[#1f1f1d] shadow-[0_4px_12px_rgba(0,0,0,0.24)]"></span>',
  iconAnchor: [8, 8],
});

function MapFocus({ memory }: { memory: MappableMemory | null }) {
  const map = useMap();

  useEffect(() => {
    if (memory?.latitude != null && memory.longitude != null) {
      map.flyTo([memory.latitude, memory.longitude], 13, {
        duration: 0.7,
      });
    }
  }, [map, memory]);

  return null;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-Hant", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T00:00:00`));
}

export function MemoryMap({ memories }: MemoryMapProps) {
  const mappableMemories = useMemo(
    () =>
      memories.filter(
        (memory) => memory.latitude != null && memory.longitude != null,
      ),
    [memories],
  );
  const [selectedMemory, setSelectedMemory] = useState<MappableMemory | null>(
    mappableMemories[0] ?? null,
  );

  const center = selectedMemory?.latitude
    ? ([selectedMemory.latitude, selectedMemory.longitude] as [number, number])
    : ([25.033, 121.5654] as [number, number]);

  if (mappableMemories.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-black/[0.16] bg-white p-8 text-center">
        <h2 className="text-xl font-semibold">Memory Map</h2>
        <p className="mt-2 text-sm leading-6 text-[#756e66]">
          還沒有帶座標的回憶。新增或修改回憶時填入緯度、經度，就會在這裡出現
          Marker。
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-black/[0.08] bg-white shadow-sm">
      <div className="border-b border-black/[0.06] p-5">
        <p className="text-sm tracking-[0.2em] text-[#a26d62]">MEMORY MAP</p>
        <h2 className="mt-2 text-2xl font-semibold">回憶地圖</h2>
      </div>
      <div className="h-[420px]">
        <MapContainer
          center={center}
          className="h-full w-full"
          scrollWheelZoom={false}
          zoom={12}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFocus memory={selectedMemory} />
          {mappableMemories.map((memory) => (
            <Marker
              eventHandlers={{
                click: () => setSelectedMemory(memory),
              }}
              icon={markerIcon}
              key={memory.id}
              position={[memory.latitude!, memory.longitude!]}
            />
          ))}
        </MapContainer>
      </div>

      {selectedMemory ? (
        <article className="grid gap-4 p-5 sm:grid-cols-[9rem_1fr]">
          {selectedMemory.photos[0]?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={selectedMemory.title}
              className="h-32 w-full rounded-2xl object-cover"
              src={selectedMemory.photos[0].image_url}
            />
          ) : (
            <div className="h-32 rounded-2xl bg-[#ebe6dd]" />
          )}
          <div>
            <p className="text-sm text-[#8a8379]">
              {formatDate(selectedMemory.memory_date)}
            </p>
            <h3 className="mt-1 text-xl font-semibold">
              {selectedMemory.title}
            </h3>
            <p className="mt-2 line-clamp-3 leading-7 text-[#68625b]">
              {selectedMemory.content || "沒有描述。"}
            </p>
          </div>
        </article>
      ) : null}
    </section>
  );
}
