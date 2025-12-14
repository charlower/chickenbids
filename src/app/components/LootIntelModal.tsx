import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import styles from './LootIntelModal.module.css';

type LootIntelModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lootData: {
    name: string;
    variant: string;
    condition: string;
    description: string;
    images: string[];
    contents: string[];
    dropTime: string;
    startPrice: number;
    floorPrice: number;
    shippingTime: string;
    shippingMethod: string;
    returnsPolicy: string;
  };
};

export default function LootIntelModal({
  isOpen,
  onClose,
  lootData,
}: LootIntelModalProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!isOpen) return null;

  const slides = lootData.images.map((img) => ({
    src: img,
    alt: lootData.name,
  }));

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modal}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          &gt;&gt; LOOT INTEL: {lootData.name.toUpperCase()} &lt;&lt;
        </div>

        {/* Image Gallery */}
        <div className={styles.imageGallery}>
          {lootData.images.map((img, index) => (
            <div
              key={index}
              className={styles.imageWrapper}
              onClick={() => {
                setLightboxIndex(index);
                setLightboxOpen(true);
              }}
              style={{ cursor: 'pointer' }}
            >
              <Image
                src={img}
                alt={`${lootData.name} - Image ${index + 1}`}
                fill
                className={styles.image}
                style={{ objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>

        {/* Lightbox */}
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={slides}
        />

        {/* Product Info */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>PRODUCT INFO</div>
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>NAME</span>
              <span className={styles.infoValue}>{lootData.name}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>VARIANT</span>
              <span className={styles.infoValue}>{lootData.variant}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>CONDITION</span>
              <span className={styles.infoValue}>{lootData.condition}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {lootData.description && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>DESCRIPTION</div>
            <p className={styles.description}>{lootData.description}</p>
          </div>
        )}

        {/* What's Included */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>WHAT&apos;S INCLUDED</div>
          <ul className={styles.contentsList}>
            {lootData.contents.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Auction Intel */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>AUCTION INTEL</div>
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>DROP TIME</span>
              <span className={styles.infoValue}>{lootData.dropTime}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>START PRICE</span>
              <span className={styles.infoValuePrice}>
                ${lootData.startPrice.toFixed(0)}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>FLOOR PRICE</span>
              <span className={styles.infoValuePrice}>
                ${lootData.floorPrice.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping & Returns */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>SHIPPING &amp; RETURNS</div>
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>DELIVERY</span>
              <span className={styles.infoValue}>{lootData.shippingTime}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>METHOD</span>
              <span className={styles.infoValue}>
                {lootData.shippingMethod}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>RETURNS</span>
              <span className={styles.infoValue}>{lootData.returnsPolicy}</span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button className={styles.closeButton} onClick={onClose}>
          CLOSE
        </button>
      </motion.div>
    </motion.div>
  );
}
