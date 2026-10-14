from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import UserAccount


class UserAccountAdmin(UserAdmin):
    # Campos a mostrar en la lista de usuarios
    list_display = (
        'email',
        'username',
        'first_name',
        'last_name',
        'is_active',
        'is_staff',
        'role',
        'verified',
        'two_factor_enabled',
    )
    list_filter = ('is_active', 'is_staff', 'is_superuser', 'two_factor_enabled', 'created_at')

    # Campos a mostrar en el formulario de edición
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password', 'verified', 'role')}),
        ('Personal Info', {'fields': ('first_name', 'last_name')}),
        ('Security', {'fields': ('two_factor_enabled',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important Dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )

    # Campos a mostrar al crear un nuevo usuario
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'first_name', 'last_name','role','verified', 'password1', 'password2', 'is_active', 'is_staff', 'is_superuser'),
        }),
    )

    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('email',)
    readonly_fields = ('created_at', 'updated_at')
    list_editable = ('role', 'verified', 'two_factor_enabled')
    actions = ('enable_two_factor', 'disable_two_factor')

    @admin.action(description="Activar 2FA de los usuarios seleccionados")
    def enable_two_factor(self, request, queryset):
        updated = queryset.update(two_factor_enabled=True)
        self.message_user(request, f"2FA activado para {updated} usuario(s).")

    @admin.action(description="Desactivar 2FA de los usuarios seleccionados")
    def disable_two_factor(self, request, queryset):
        # También se descarta cualquier código de login pendiente
        updated = queryset.update(two_factor_enabled=False, otp_secret=None)
        self.message_user(request, f"2FA desactivado para {updated} usuario(s).")

admin.site.register(UserAccount, UserAccountAdmin)