import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import MainLayout from './Layouts/MainLayout';
import SystemUIContainer from './Components/SystemUI/SystemUIContainer';
import '../css/app.css';

createInertiaApp({
    resolve: async (name) => {
        const page = await resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx'));
        if (name !== 'Login') {
            page.default.layout = page.default.layout || ((p) => <MainLayout>{p}</MainLayout>);
        }
        return page;
    },
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(
            <>
                <App {...props} />
                <SystemUIContainer />
            </>
        );
    },
});
