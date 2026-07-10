"use client";

import { useState } from "react";
import { CarCard, Car } from "@/components/CarCard";
import { PasswordModal } from "@/components/PasswordModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const CARS: Car[] = [
  { id: "1", make: "Porsche", model: "911 GT3", year: 2023, price: 161100, imageUrl: "https://images.unsplash.com/photo-1719608626797-7e210c5de1ab?auto=format&fit=crop&w=600&q=80" },
  { id: "2", make: "Ferrari", model: "F8 Tributo", year: 2022, price: 276550, imageUrl: "https://images.unsplash.com/photo-1689255680603-cccb6ab43e1b?auto=format&fit=crop&w=600&q=80" },
  { id: "3", make: "Lamborghini", model: "Huracán EVO", year: 2023, price: 248295, imageUrl: "https://images.unsplash.com/photo-1742800074526-cc655bf036a4?auto=format&fit=crop&w=600&q=80" },
  { id: "4", make: "McLaren", model: "720S", year: 2022, price: 299000, imageUrl: "/mclaren.avif" },
  { id: "5", make: "Aston Martin", model: "Vantage", year: 2023, price: 143900, imageUrl: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=600&q=80" },
  { id: "6", make: "Mercedes-AMG", model: "GT Black Series", year: 2021, price: 325000, imageUrl: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=600&q=80", isDecoy: true },
  { id: "7", make: "Audi", model: "R8 V10 Performance", year: 2023, price: 158600, imageUrl: "https://images.unsplash.com/photo-1725689221132-f6056e82c828?auto=format&fit=crop&w=600&q=80" },
  { id: "8", make: "Bentley", model: "Continental GT", year: 2023, price: 238325, imageUrl: "https://images.unsplash.com/photo-1747770641121-7f1775d89421?auto=format&fit=crop&w=600&q=80" },
  { id: "9", make: "Rolls-Royce", model: "Wraith", year: 2022, price: 343000, imageUrl: "/rolls.webp" }
];

export function CarGallery() {
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleCarClick = (car: Car) => {
    if (car.isDecoy) {
      setIsPasswordModalOpen(true);
    } else {
      setSelectedCar(car);
    }
  };

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Automotores 
        </h1>
        <p className="mt-4 text-xl text-slate-400">
          Exclusive inventory for discerning collectors.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {CARS.map(car => (
          <CarCard key={car.id} car={car} onClick={() => handleCarClick(car)} />
        ))}
      </div>

      <PasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />

      <Dialog open={!!selectedCar} onOpenChange={() => setSelectedCar(null)}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-800 text-slate-50">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedCar?.make} {selectedCar?.model}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Year: {selectedCar?.year} | Price: ${selectedCar?.price?.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video relative rounded-md overflow-hidden bg-slate-800 mt-4">
            {selectedCar?.imageUrl && (
              <img src={selectedCar.imageUrl} alt="Car" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="mt-4 text-slate-300">
            <p>Contact our sales team to schedule a private viewing of this exceptional vehicle. Located at our secure facility.</p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
