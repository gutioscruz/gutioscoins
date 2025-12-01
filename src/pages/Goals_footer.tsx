        </Dialog>

        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Excluir Meta"
          description="Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita."
          onConfirm={confirmDelete}
          confirmText="Excluir"
          cancelText="Cancelar"
        />
      </main>
    </div>
  );
};

export default Goals;
