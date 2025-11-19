import React, { useState, useContext, useRef, useEffect } from 'react';
import Header from '../components/Header';
import GeneratorPage from '../pages/GeneratorPage';
import ProfilePage from '../pages/ProfilePage';
import SupportPage from '../pages/SupportPage';
import FavoritesPage from '../pages/FavoritesPage';
import PublicGalleryPage from '../pages/PublicGalleryPage';
import MiniGallery from '../components/MiniGallery';
import Toast from '../components/Toast';
import { AuthContext } from '../context/AuthContext';
import { CreditPlan } from '../types';
import { UploadIcon, SpinnerIcon } from '../components/Icons';
import LowCreditWarning from '../components/LowCreditWarning';
import Modal from '../components/Modal';
import SelectPlanModal from '../components/SelectPlanModal';
import PaymentRequestModal from '../components/PaymentRequestModal';

type Page = 'generator' | 'profile' | 'support' | 'favorites' | 'gallery';

const LoggedInLayout: React.FC = () => {
    const { user, addUserUploadedImage, notifications, markNotificationsAsRead } = useContext(AuthContext);
    const [currentPage, setCurrentPage] = useState<Page>('generator');
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [activeToast, setActiveToast] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [showLowCreditWarning, setShowLowCreditWarning] = useState(false);

    // State for the new credit purchase flow
    const [isSelectPlanModalOpen, setSelectPlanModalOpen] = useState(false);
    const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<CreditPlan | null>(null);

    useEffect(() => {
        if (!user) return;
        const warningDismissed = sessionStorage.getItem('lowCreditWarningDismissed') === 'true';
        if (user.credits > 5) {
            sessionStorage.removeItem('lowCreditWarningDismissed');
        }
        if (user.credits > 0 && user.credits <= 5 && !warningDismissed) {
            setShowLowCreditWarning(true);
        } else {
            setShowLowCreditWarning(false);
        }
    }, [user, user?.credits]);

    useEffect(() => {
        if (activeToast || !user || !notifications) return;

        const unread = notifications
            .filter(n => !n.read && n.userId === user.id)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        if (unread.length > 0) {
            const nextNotification = unread[0];
            setActiveToast({
                id: nextNotification.id,
                message: nextNotification.message,
                type: nextNotification.type
            });
        }
    }, [notifications, user, activeToast]);

    const handleToastClose = () => {
        if (activeToast) {
            markNotificationsAsRead([activeToast.id]);
            setActiveToast(null);
        }
    };
    
    const handleDismissLowCreditWarning = () => {
        setShowLowCreditWarning(false);
        sessionStorage.setItem('lowCreditWarningDismissed', 'true');
    };
    
    const openSelectPlanModal = () => setSelectPlanModalOpen(true);

    const handleBuyCreditsFromWarning = () => {
        setShowLowCreditWarning(false);
        openSelectPlanModal();
    };
    
    const handlePlanSelected = (plan: CreditPlan) => {
        setSelectPlanModalOpen(false);
        setSelectedPlanForPayment(plan);
    };

    const UploadImageModal: React.FC = () => {
        const [imageFile, setImageFile] = useState<File | null>(null);
        const [previewUrl, setPreviewUrl] = useState<string | null>(null);
        const [title, setTitle] = useState('');
        const [loading, setLoading] = useState(false);
        const fileInputRef = useRef<HTMLInputElement>(null);

        const handleFileSelect = (file: File) => {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                setActiveToast({ id: `err-${Date.now()}`, message: 'Invalid file type. Use JPG, PNG, or WEBP.', type: 'error' });
                return;
            }
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                setActiveToast({ id: `err-${Date.now()}`, message: 'File is too large. Max size is 5MB.', type: 'error' });
                return;
            }
            setImageFile(file);
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(URL.createObjectURL(file));
        };

        const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (file) handleFileSelect(file);
        };

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!imageFile || !title.trim()) return;
            setLoading(true);

            const reader = new FileReader();
            reader.onloadend = () => {
                const imageUrl = reader.result as string;
                addUserUploadedImage(imageUrl, title);
                setLoading(false);
                setUploadModalOpen(false);
                setActiveToast({ id: `succ-${Date.now()}`, message: 'Image successfully published to gallery!', type: 'success' });
            };
            reader.onerror = () => {
                setLoading(false);
                setActiveToast({ id: `err-${Date.now()}`, message: 'Failed to read file.', type: 'error' });
            }
            reader.readAsDataURL(imageFile);
        };

        return (
            <Modal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Upload Image to Gallery">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-48 bg-light dark:bg-dark border-2 border-dashed border-border-light dark:border-border-dark rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-md" />
                            ) : (
                                <>
                                    <UploadIcon className="w-8 h-8 text-secondary-light dark:text-secondary-dark mb-2" />
                                    <p className="font-semibold">Click to upload image</p>
                                    <p className="text-xs text-secondary-light dark:text-secondary-dark">PNG, JPG, or WEBP (Max 5MB)</p>
                                </>
                            )}
                        </div>
                    </div>
                     <div>
                        <label htmlFor="title" className="block text-sm font-medium text-secondary-light dark:text-secondary-dark mb-1">Image Title</label>
                        <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., 'Sunset over the mountains'" required className="w-full p-2.5 bg-transparent border border-border-light dark:border-border-dark rounded-lg focus:ring-1 focus:ring-black dark:focus:ring-white focus:outline-none" />
                    </div>
                    <button type="submit" disabled={loading || !imageFile || !title.trim()} className="w-full p-3 font-semibold text-white bg-black rounded-lg hover:bg-gray-800 dark:text-black dark:bg-white dark:hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center">
                         {loading && <SpinnerIcon className="animate-spin mr-2 h-5 w-5" />}
                        {loading ? 'Uploading...' : 'Publish to Gallery'}
                    </button>
                </form>
            </Modal>
        );
    };

    return (
        <div className="min-h-screen bg-light dark:bg-dark text-primary-light dark:text-primary-dark">
            <Header 
                onNavigate={(page) => setCurrentPage(page)} 
                onBuyCredits={openSelectPlanModal} 
                onUploadImage={() => setUploadModalOpen(true)}
            />
            
            <div className="pt-16">
                 <div key={currentPage} className="animate-fade-in">
                    {currentPage === 'generator' && <GeneratorPage onBuyCredits={openSelectPlanModal} />}
                    {currentPage === 'profile' && <ProfilePage onNavigateBack={() => setCurrentPage('generator')} onNavigateToSupport={() => setCurrentPage('support')} onBuyCredits={openSelectPlanModal} />}
                    {currentPage === 'support' && <SupportPage onNavigateBack={() => setCurrentPage('profile')} />}
                    {currentPage === 'favorites' && <FavoritesPage onNavigateBack={() => setCurrentPage('generator')} />}
                    {currentPage === 'gallery' && <PublicGalleryPage onNavigateBack={() => setCurrentPage('generator')} />}
                </div>
            </div>
            
            {isSelectPlanModalOpen && <SelectPlanModal onClose={() => setSelectPlanModalOpen(false)} onSelectPlan={handlePlanSelected} />}
            {selectedPlanForPayment && <PaymentRequestModal plan={selectedPlanForPayment} onClose={() => setSelectedPlanForPayment(null)} />}
            
            {isUploadModalOpen && <UploadImageModal />}
            <MiniGallery onOpenFavorites={() => setCurrentPage('favorites')} />
            {activeToast && <Toast message={activeToast.message} type={activeToast.type} onClose={handleToastClose} />}
            {showLowCreditWarning && <LowCreditWarning onDismiss={handleDismissLowCreditWarning} onBuyCredits={handleBuyCreditsFromWarning} />}
        </div>
    );
};

export default LoggedInLayout;