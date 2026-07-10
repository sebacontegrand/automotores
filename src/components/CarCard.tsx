"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export type Car = {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  imageUrl: string;
  isDecoy?: boolean;
};

interface CarCardProps {
  car: Car;
  onClick: () => void;
}

export function CarCard({ car, onClick }: CarCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer h-full"
      onClick={onClick}
    >
      <Card className="h-full flex flex-col bg-slate-900 border-slate-800 overflow-hidden">
        <div className="h-48 w-full bg-slate-800 overflow-hidden">
          <img
            src={car.imageUrl}
            alt={`${car.make} ${car.model}`}
            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
          />
        </div>
        <CardHeader>
          <CardTitle className="text-xl text-slate-100">{car.make} {car.model}</CardTitle>
          <CardDescription className="text-slate-400">{car.year}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-lg font-semibold text-blue-400">${car.price.toLocaleString()}</p>
        </CardContent>
        <CardFooter>
          <Button variant="secondary" className="w-full">View Details</Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
