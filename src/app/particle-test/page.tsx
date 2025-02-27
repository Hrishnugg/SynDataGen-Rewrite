"use client";

import { useState } from "react";
import { Tab } from "@headlessui/react";
import DreamyParticles from "@/components/dreamy-particles/DreamyParticles";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function ParticleTest() {
  const [activeModel, setActiveModel] = useState("sphere");
  const [primaryColor, setPrimaryColor] = useState<[number, number, number]>([
    1.0, 0.8, 0.3,
  ]);
  const [mouseStrength, setMouseStrength] = useState(0.05);

  const colorOptions = [
    { name: "Gold", primary: [1.0, 0.8, 0.3] },
    { name: "Blue", primary: [0.2, 0.4, 1.0] },
    { name: "Green", primary: [0.2, 0.8, 0.4] },
    { name: "Purple", primary: [0.8, 0.2, 0.8] },
    { name: "Red", primary: [1.0, 0.2, 0.2] },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 text-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 mt-4">Particle System Demo</h1>

        <div className="mb-8">
          <Tab.Group>
            <Tab.List className="flex space-x-1 rounded-xl bg-gray-800 p-1">
              <Tab
                className={({ selected }) =>
                  classNames(
                    "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                    "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                    selected
                      ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow"
                      : "text-blue-100 hover:bg-gray-700 hover:text-white",
                  )
                }
              >
                Dreamy
              </Tab>
            </Tab.List>
            <Tab.Panels className="mt-2">
              <Tab.Panel className="rounded-xl bg-gray-800 p-4">
                <div className="relative h-[70vh] w-full rounded-lg overflow-hidden">
                  <DreamyParticles
                    modelPath={activeModel}
                    primaryColor={primaryColor}
                    mouseStrength={mouseStrength}
                  />

                  <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 rounded-lg p-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">
                        Model
                      </label>
                      <select
                        className="bg-gray-700 text-white rounded-lg w-full p-2"
                        value={activeModel}
                        onChange={(e) => setActiveModel(e.target.value)}
                      >
                        <option value="sphere">Default Sphere</option>
                        <option value="/models/mask.glb">Mask</option>
                        <option value="/models/cyborg.glb">Cyborg</option>
                        <option value="/models/samurai.glb">Samurai</option>
                        <option value="/models/veneciaMask.glb">
                          Venecia Mask
                        </option>
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">
                        Mouse Strength
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={mouseStrength}
                        onChange={(e) =>
                          setMouseStrength(parseFloat(e.target.value))
                        }
                        className="w-full"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      {colorOptions.map((color, index) => (
                        <button
                          key={index}
                          className={`p-2 rounded-lg text-center ${
                            JSON.stringify(primaryColor) ===
                            JSON.stringify(color.primary)
                              ? "ring-2 ring-white"
                              : "opacity-80 hover:opacity-100"
                          }`}
                          style={{
                            background: `rgb(${color.primary[0] * 255}, ${color.primary[1] * 255}, ${color.primary[2] * 255})`,
                          }}
                          onClick={() => {
                            setPrimaryColor(
                              color.primary as [number, number, number],
                            );
                          }}
                        >
                          {color.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    </div>
  );
}
