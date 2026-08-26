"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { motion } from "motion/react";

import { Link } from "@/i18n/navigation";
import { staggerItemVariants } from "./NavMegaMenu";

export type CategoryMenuItem = {
  id: string;
  handle: string;
  title: string;
  imageUrl?: string;
  imageAlt?: string;
};

export function CategoriesMenuGrid({ categories }: { categories: CategoryMenuItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {categories.map((category) => (
        <motion.div key={category.id} variants={staggerItemVariants}>
          <Link href={`/collections/${category.handle}`} className="group flex flex-col gap-2">
            <div className="bg-muted relative aspect-[4/3] overflow-hidden rounded-md">
              {category.imageUrl ? (
                <Image
                  src={category.imageUrl}
                  alt={category.imageAlt ?? category.title}
                  fill
                  sizes="180px"
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <ImageIcon className="text-muted-foreground size-6" aria-hidden="true" />
                </div>
              )}
            </div>
            <span className="text-sm font-medium group-hover:underline">{category.title}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
