<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { 
  Image as ImageIcon, Upload, Trash2, Copy, Check, 
  Loader2, AlertCircle, FileText, ExternalLink
} from 'lucide-vue-next';

interface UploadedImage {
  id: string;
  name: string;
  filename: string;
  url: string;
  createdAt: string;
}

const images = ref<UploadedImage[]>([]);
const isLoading = ref(false);
const isUploading = ref(false);

// Upload form state
const uploadName = ref('');
const selectedFile = ref<File | null>(null);
const filePreview = ref<string | null>(null);
const dragOver = ref(false);

// Copied tooltip state
const copiedId = ref<string | null>(null);

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

const fetchImages = async () => {
  isLoading.value = true;
  try {
    const res = await axios.get('/api/images', getHeaders());
    images.value = res.data;
  } catch (error) {
    console.error('Failed to fetch images:', error);
  } finally {
    isLoading.value = false;
  }
};

// Handle file selection
const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    processFile(target.files[0]);
  }
};

const processFile = (file: File) => {
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file (PNG, JPG, JPEG, WEBP, etc.)');
    return;
  }
  selectedFile.value = file;
  if (!uploadName.value) {
    // Default name to file name without extension
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    uploadName.value = baseName;
  }

  // Create preview
  const reader = new FileReader();
  reader.onload = (e) => {
    filePreview.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

// Drag and drop handlers
const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  dragOver.value = true;
};

const handleDragLeave = () => {
  dragOver.value = false;
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  dragOver.value = false;
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    processFile(e.dataTransfer.files[0]);
  }
};

// Upload Image
const uploadImage = async () => {
  if (!selectedFile.value || !uploadName.value.trim() || !filePreview.value) return;
  isUploading.value = true;

  try {
    const payload = {
      name: uploadName.value.trim(),
      filename: selectedFile.value.name,
      base64: filePreview.value
    };

    const res = await axios.post('/api/images', payload, getHeaders());
    images.value.unshift(res.data);
    
    // Reset Form
    cancelUpload();
  } catch (error) {
    console.error('Failed to upload image:', error);
    alert('Failed to upload image. Please try again.');
  } finally {
    isUploading.value = false;
  }
};

const cancelUpload = () => {
  uploadName.value = '';
  selectedFile.value = null;
  filePreview.value = null;
};

// Copy Link to Clipboard
const copyLink = async (img: UploadedImage) => {
  try {
    // Generate full URL
    // If url returned by backend is absolute, copy it directly.
    // If relative, prefix it with backend url or window origin.
    let fullUrl = img.url;
    if (img.url.startsWith('/')) {
      const axiosBase = axios.defaults.baseURL || window.location.origin;
      // strip trailing slash from base if present
      const base = axiosBase.endsWith('/') ? axiosBase.slice(0, -1) : axiosBase;
      fullUrl = `${base}${img.url}`;
    }

    await navigator.clipboard.writeText(fullUrl);
    copiedId.value = img.id;
    setTimeout(() => {
      if (copiedId.value === img.id) {
        copiedId.value = null;
      }
    }, 2000);
  } catch (error) {
    console.error('Failed to copy link:', error);
  }
};

// Delete Image
const deleteImage = async (img: UploadedImage) => {
  if (!confirm(`Are you sure you want to delete "${img.name}"?`)) return;

  try {
    await axios.delete(`/api/images/${img.id}`, getHeaders());
    images.value = images.value.filter(i => i.id !== img.id);
  } catch (error) {
    console.error('Failed to delete image:', error);
    alert('Failed to delete image.');
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

// Get image resolution URL for display
const displayUrl = (img: UploadedImage) => {
  if (img.url.startsWith('http')) {
    return img.url;
  }
  const axiosBase = axios.defaults.baseURL || 'http://localhost:3000';
  const base = axiosBase.endsWith('/') ? axiosBase.slice(0, -1) : axiosBase;
  return `${base}${img.url}`;
};

onMounted(() => {
  fetchImages();
});
</script>

<template>
  <div class="page-container animate-fade-in">
    <header class="page-header">
      <div class="header-title">
        <ImageIcon :size="28" color="var(--primary)" />
        <h1>Image Management (CRUD)</h1>
      </div>
      <p class="subtitle">Upload product images, copy their chatbot link, and manage files stored in your local <code>./images</code> directory.</p>
    </header>

    <div class="layout-grid">
      <!-- Upload Section -->
      <div class="glass-panel upload-card">
        <h3>Upload New Image</h3>
        <p class="upload-desc">Images will be stored in your server's local folder and are accessible publicly for WhatsApp media messages.</p>

        <form @submit.prevent="uploadImage" class="upload-form">
          <div class="form-group">
            <label>Image Display Name</label>
            <input 
              v-model="uploadName" 
              type="text" 
              placeholder="e.g. Sepatu Vans Hitam" 
              class="input-field" 
              required
              :disabled="isUploading"
            />
          </div>

          <!-- Drag & Drop Zone -->
          <div 
            class="drag-drop-zone"
            :class="{ 'drag-over': dragOver, 'has-file': selectedFile }"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
            @click="$refs.fileInput.click()"
          >
            <input 
              ref="fileInput" 
              type="file" 
              class="hidden-input" 
              accept="image/*"
              @change="handleFileChange"
              :disabled="isUploading"
            />

            <!-- Empty State -->
            <div v-if="!filePreview" class="dropzone-content">
              <Upload :size="32" class="upload-icon" />
              <p class="main-text">Drag and drop your image here, or <span>browse</span></p>
              <p class="sub-text">PNG, JPG, JPEG, WEBP or GIF</p>
            </div>

            <!-- Preview State -->
            <div v-else class="preview-container">
              <img :src="filePreview" alt="Upload Preview" class="image-preview" />
              <div class="file-info">
                <FileText :size="16" />
                <span class="file-name">{{ selectedFile?.name }}</span>
              </div>
            </div>
          </div>

          <div class="form-actions" v-if="selectedFile">
            <button type="button" @click="cancelUpload" class="btn-primary btn-secondary" :disabled="isUploading">
              Cancel
            </button>
            <button type="submit" class="btn-primary" :disabled="isUploading">
              <Loader2 v-if="isUploading" class="spin-icon" :size="16" />
              <span>{{ isUploading ? 'Uploading...' : 'Save Image' }}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Image List Section -->
      <div class="list-section">
        <div v-if="isLoading" class="loading-state glass-panel">
          <Loader2 class="spin-icon text-primary" :size="48" />
          <p>Loading image repository...</p>
        </div>

        <div v-else-if="images.length === 0" class="empty-state glass-panel">
          <ImageIcon :size="48" color="var(--text-muted)" />
          <h3>No images stored yet</h3>
          <p>Upload files on the left to start building your product catalog.</p>
        </div>

        <div v-else class="image-grid">
          <div v-for="img in images" :key="img.id" class="image-card glass-panel animate-fade-in">
            <!-- Thumbnail Wrapper -->
            <div class="card-thumbnail-wrapper">
              <img :src="displayUrl(img)" :alt="img.name" class="card-thumbnail" loading="lazy" />
              <a :href="displayUrl(img)" target="_blank" class="zoom-btn" title="Open in new tab">
                <ExternalLink :size="16" />
              </a>
            </div>

            <!-- Card Body -->
            <div class="card-body">
              <h4 class="image-title">{{ img.name }}</h4>
              <code class="image-filename" :title="img.filename">{{ img.filename }}</code>
              
              <!-- Meta Row -->
              <div class="card-meta">
                <span class="card-date">{{ formatDate(img.createdAt) }}</span>
              </div>

              <!-- Action Buttons -->
              <div class="card-actions">
                <button 
                  @click="copyLink(img)" 
                  class="action-btn copy-btn"
                  :class="{ 'copied': copiedId === img.id }"
                  :title="copiedId === img.id ? 'Copied URL!' : 'Copy chatbot image directive'"
                >
                  <Check v-if="copiedId === img.id" :size="16" />
                  <Copy v-else :size="16" />
                  <span>{{ copiedId === img.id ? 'Copied' : 'Copy Link' }}</span>
                </button>

                <button @click="deleteImage(img)" class="action-btn delete-btn" title="Delete image">
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  margin-bottom: 0.5rem;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.header-title h1 {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.subtitle {
  color: var(--text-muted);
  font-size: 1.05rem;
}

.layout-grid {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 1024px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }
}

.upload-card {
  padding: 1.5rem;
  position: sticky;
  top: 1rem;
}

.upload-card h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  color: white;
}

.upload-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin-bottom: 1.5rem;
}

.upload-form {
  display: flex;
  flex-direction: column;
}

/* Drag & Drop Zone */
.drag-drop-zone {
  border: 2px dashed rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.4);
  padding: 2rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 1.5rem;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drag-drop-zone:hover, .drag-drop-zone.drag-over {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.05);
}

.drag-drop-zone.has-file {
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.2);
  padding: 1rem;
}

.hidden-input {
  display: none;
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.upload-icon {
  color: var(--text-muted);
  transition: color 0.2s;
}

.drag-drop-zone:hover .upload-icon {
  color: var(--primary);
}

.main-text {
  font-size: 0.95rem;
  color: var(--text-main);
  font-weight: 500;
}

.main-text span {
  color: var(--primary);
  text-decoration: underline;
}

.sub-text {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* File Preview inside Dropzone */
.preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.image-preview {
  max-width: 100%;
  max-height: 180px;
  border-radius: 8px;
  object-fit: contain;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255,255,255,0.05);
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: 1px solid var(--border-glass);
  max-width: 100%;
}

.file-name {
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border-glass);
  color: var(--text-muted);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

/* Image List Section */
.list-section {
  flex: 1;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6rem 2rem;
  text-align: center;
  gap: 1rem;
  color: var(--text-muted);
}

.empty-state h3 {
  color: var(--text-main);
  font-size: 1.25rem;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.25rem;
}

.image-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.image-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
}

.card-thumbnail-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16/10;
  background: rgba(15, 23, 42, 0.8);
  border-bottom: 1px solid var(--border-glass);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.image-card:hover .card-thumbnail {
  transform: scale(1.05);
}

.zoom-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  border: 1px solid var(--border-glass);
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(-5px);
  transition: all 0.2s ease;
}

.image-card:hover .zoom-btn {
  opacity: 1;
  transform: translateY(0);
}

.zoom-btn:hover {
  background: var(--primary);
}

.card-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.image-title {
  font-size: 1rem;
  font-weight: 600;
  color: white;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-filename {
  font-size: 0.75rem;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: fit-content;
  max-width: 100%;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
}

.action-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-glass);
  color: var(--text-muted);
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 500;
}

.copy-btn {
  flex: 1;
  color: white;
}

.copy-btn:hover {
  background: var(--primary);
  border-color: var(--primary);
  transform: translateY(-1px);
}

.copy-btn.copied {
  background: var(--success);
  border-color: var(--success);
  color: white;
}

.delete-btn {
  color: var(--text-muted);
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.3);
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}
</style>
