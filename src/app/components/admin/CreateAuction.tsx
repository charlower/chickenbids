'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/lib/supabase/client';
import styles from './CreateAuction.module.css';

export function CreateAuction() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Form state
  const [productName, setProductName] = useState('');
  const [productVariant, setProductVariant] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productCondition, setProductCondition] = useState('Brand New');
  const [productContents, setProductContents] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [shippingTime, setShippingTime] = useState('7 business days');
  const [shippingMethod, setShippingMethod] = useState(
    'Australia Post with tracking'
  );
  const [returnsPolicy, setReturnsPolicy] = useState('DOA only');
  const [startPrice, setStartPrice] = useState('');
  const [floorPrice, setFloorPrice] = useState('');
  const [dropRate, setDropRate] = useState('1.00');
  const [startAt, setStartAt] = useState('');
  const [livestreamUrl, setLivestreamUrl] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000);
  };

  // Dropzone for images
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    maxFiles: 5,
    onDrop: (acceptedFiles) => {
      setImages(acceptedFiles);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!productName || !startPrice || !floorPrice || !startAt) {
        setMessage('ERROR: MISSING REQUIRED FIELDS');
        setLoading(false);
        setTimeout(() => setMessage(''), 5000);
        return;
      }

      const startPriceNum = parseFloat(startPrice);
      const floorPriceNum = parseFloat(floorPrice);
      const dropRateNum = parseFloat(dropRate);

      if (isNaN(startPriceNum) || isNaN(floorPriceNum) || isNaN(dropRateNum)) {
        setMessage('ERROR: INVALID PRICE VALUES');
        setLoading(false);
        setTimeout(() => setMessage(''), 5000);
        return;
      }

      if (startPriceNum <= floorPriceNum) {
        setMessage('ERROR: START PRICE MUST BE GREATER THAN FLOOR PRICE');
        setLoading(false);
        setTimeout(() => setMessage(''), 5000);
        return;
      }

      // 1. Create product
      const contentsArray = productContents
        ? productContents.split(',').map((item) => item.trim())
        : [];

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          name: productName,
          variant: productVariant || null,
          description: productDescription || null,
          condition: productCondition,
          contents: contentsArray,
          retail_price: retailPrice ? parseFloat(retailPrice) : null,
          shipping_time: shippingTime,
          shipping_method: shippingMethod,
          returns_policy: returnsPolicy,
        })
        .select()
        .single();

      if (productError) throw productError;

      // 2. Upload images to Supabase Storage
      setUploading(true);
      const imageUrls: string[] = [];

      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${product.id}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('product-images').getPublicUrl(fileName);

        imageUrls.push(publicUrl);

        // Save to product_images table
        await supabase.from('product_images').insert({
          product_id: product.id,
          url: publicUrl,
          position: i,
        });
      }

      setUploading(false);

      // 3. Create auction
      const { data: auction, error: auctionError } = await supabase
        .from('auctions')
        .insert({
          product_id: product.id,
          start_price: startPriceNum,
          floor_price: floorPriceNum,
          current_price: startPriceNum,
          drop_rate: dropRateNum,
          start_at: new Date(startAt).toISOString(),
          livestream_url: livestreamUrl || null,
          status: 'scheduled',
        })
        .select()
        .single();

      if (auctionError) throw auctionError;

      showMessage(`✓ AUCTION CREATED: ${auction.id.slice(0, 8)}...`);

      // Reset form
      setProductName('');
      setProductVariant('');
      setProductDescription('');
      setProductCondition('Brand New');
      setProductContents('');
      setRetailPrice('');
      setShippingTime('7 business days');
      setShippingMethod('Australia Post with tracking');
      setReturnsPolicy('DOA only');
      setStartPrice('');
      setFloorPrice('');
      setDropRate('1.00');
      setStartAt('');
      setLivestreamUrl('');
      setImages([]);
    } catch (error) {
      console.error('Create auction error:', error);
      setMessage(
        `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Message Banner */}
      {message && (
        <div
          className={`${styles.messageBanner} ${message.includes('ERROR') ? styles.messageError : ''}`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Product Details */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>PRODUCT DETAILS</div>

          <div className={styles.field}>
            <label className={styles.label}>
              PRODUCT NAME <span className={styles.required}>*</span>
            </label>
            <input
              type='text'
              className={styles.input}
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder='e.g., PlayStation 5 Console'
              required
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>VARIANT</label>
              <input
                type='text'
                className={styles.input}
                value={productVariant}
                onChange={(e) => setProductVariant(e.target.value)}
                placeholder='e.g., Disc Edition · 825GB'
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>CONDITION</label>
              <input
                type='text'
                className={styles.input}
                value={productCondition}
                onChange={(e) => setProductCondition(e.target.value)}
                placeholder='e.g., Brand New, Sealed'
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>DESCRIPTION</label>
            <textarea
              className={styles.textarea}
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder='e.g., Latest model with enhanced features...'
              rows={3}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>RETAIL PRICE ($)</label>
            <input
              type='number'
              step='0.01'
              className={styles.input}
              value={retailPrice}
              onChange={(e) => setRetailPrice(e.target.value)}
              placeholder='e.g., 799.00'
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>CONTENTS (comma-separated)</label>
            <textarea
              className={styles.textarea}
              value={productContents}
              onChange={(e) => setProductContents(e.target.value)}
              placeholder='e.g., Console, DualSense Controller, HDMI Cable, Power Cable, USB Cable'
              rows={3}
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>SHIPPING TIME</label>
              <input
                type='text'
                className={styles.input}
                value={shippingTime}
                onChange={(e) => setShippingTime(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>SHIPPING METHOD</label>
              <input
                type='text'
                className={styles.input}
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>RETURNS POLICY</label>
            <input
              type='text'
              className={styles.input}
              value={returnsPolicy}
              onChange={(e) => setReturnsPolicy(e.target.value)}
            />
          </div>

          {/* Image Upload */}
          <div className={styles.field}>
            <label className={styles.label}>PRODUCT IMAGES (up to 5)</label>
            <div {...getRootProps()} className={styles.dropzone}>
              <input {...getInputProps()} />
              {isDragActive ? (
                <p>Drop images here...</p>
              ) : (
                <p>
                  {images.length > 0
                    ? `${images.length} image(s) selected`
                    : 'Drag & drop images here, or click to select'}
                </p>
              )}
            </div>
            {images.length > 0 && (
              <div className={styles.imagePreview}>
                {images.map((file, idx) => (
                  <div key={idx} className={styles.previewItem}>
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${idx + 1}`}
                      className={styles.previewImage}
                    />
                    <button
                      type='button'
                      onClick={() =>
                        setImages(images.filter((_, i) => i !== idx))
                      }
                      className={styles.removeButton}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Auction Settings */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>AUCTION SETTINGS</div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>
                START PRICE ($) <span className={styles.required}>*</span>
              </label>
              <input
                type='number'
                step='0.01'
                className={styles.input}
                value={startPrice}
                onChange={(e) => setStartPrice(e.target.value)}
                placeholder='e.g., 999.00'
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                FLOOR PRICE ($) <span className={styles.required}>*</span>
              </label>
              <input
                type='number'
                step='0.01'
                className={styles.input}
                value={floorPrice}
                onChange={(e) => setFloorPrice(e.target.value)}
                placeholder='e.g., 0.00'
                required
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>
                DROP RATE ($/second) <span className={styles.required}>*</span>
              </label>
              <input
                type='number'
                step='0.01'
                className={styles.input}
                value={dropRate}
                onChange={(e) => setDropRate(e.target.value)}
                placeholder='e.g., 1.00'
                required
              />
              <div className={styles.hint}>
                Duration: ~
                {startPrice && floorPrice && dropRate
                  ? Math.ceil(
                      (parseFloat(startPrice) - parseFloat(floorPrice)) /
                        parseFloat(dropRate)
                    )
                  : 0}{' '}
                seconds
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                START TIME <span className={styles.required}>*</span>
              </label>
              <input
                type='datetime-local'
                className={styles.input}
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                YOUTUBE VIDEO ID (Optional)
              </label>
              <input
                type='text'
                className={styles.input}
                value={livestreamUrl}
                onChange={(e) => setLivestreamUrl(e.target.value)}
                placeholder='TlUZ2llE02k'
              />
              <div className={styles.hint}>
                Paste only the YouTube video ID (e.g., TlUZ2llE02k from
                youtube.com/watch?v=TlUZ2llE02k)
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className={styles.actions}>
          <button
            type='submit'
            className={styles.submitButton}
            disabled={loading || uploading}
          >
            {uploading
              ? 'UPLOADING IMAGES...'
              : loading
                ? 'CREATING...'
                : '✓ CREATE AUCTION'}
          </button>
        </div>
      </form>
    </div>
  );
}
