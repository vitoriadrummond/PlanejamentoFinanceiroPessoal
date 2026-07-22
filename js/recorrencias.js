function abrirModalRecorrencia(id = null) {
    const recorrencia = id
        ? estado.recorrencias.find(item => Number(item.id) === Number(id))
        : null;

    abrirModal(
        recorrencia ? "Editar recorrência" : "Nova recorrência",
        `
            <form id="formRecorrencia" class="form-grid">
                <label>
                    Natureza
                    <select id="rNatureza">
                        <option value="saida">Saída</option>
                        <option value="entrada">Entrada</option>
                    </select>
                </label>

                <label>
                    Tipo
                    <select id="rTipo">
                        <option value="fixo">Fixo</option>
                        <option value="variavel">Variável</option>
                    </select>
                </label>

                <label>
                    Categoria
                    <select id="rCategoria">
                        <option value="">Sem categoria</option>
                        ${opcoesCategoria()}
                    </select>
                </label>

                <label>
                    Cartão
                    <select id="rCartao">
                        <option value="">Sem cartão</option>
                        ${opcoesCartao()}
                    </select>
                </label>

                <label class="span-2">
                    Descrição
                    <input id="rDescricao" required>
                </label>

                <label>
                    Valor
                    <input id="rValor" type="number" min="0" step="0.01" required>
                </label>

                <label>
                    Dia do vencimento
                    <input id="rDia" type="number" min="1" max="31" required>
                </label>

                <label>
                    Competência inicial
                    <input id="rInicio" type="month" required>
                </label>

                <label>
                    Competência final
                    <input id="rFim" type="month">
                </label>

                <label>
                    Ativa
                    <select id="rAtivo">
                        <option value="true">Sim</option>
                        <option value="false">Não</option>
                    </select>
                </label>

                <div class="form-actions span-2">
                    ${recorrencia ? `
                        <button
                            id="btnExcluirRecorrencia"
                            class="btn danger"
                            type="button"
                        >
                            Excluir
                        </button>
                    ` : ""}

                    <div class="spacer"></div>

                    <button
                        class="btn secondary"
                        type="button"
                        onclick="fecharModal()"
                    >
                        Cancelar
                    </button>

                    <button class="btn primary" type="submit">
                        Salvar
                    </button>
                </div>
            </form>
        `
    );

    document.getElementById("rNatureza").value = recorrencia?.natureza || "saida";
    document.getElementById("rTipo").value = recorrencia?.tipo || "fixo";
    document.getElementById("rCategoria").value = recorrencia?.categoria_id || "";
    document.getElementById("rCartao").value = recorrencia?.cartao_id || "";
    document.getElementById("rDescricao").value = recorrencia?.descricao || "";
    document.getElementById("rValor").value = recorrencia?.valor ?? "";
    document.getElementById("rDia").value = recorrencia?.dia_vencimento ?? "";
    document.getElementById("rInicio").value = recorrencia
        ? chaveMes(recorrencia.competencia_inicial)
        : competenciaAtual();
    document.getElementById("rFim").value = recorrencia?.competencia_final
        ? chaveMes(recorrencia.competencia_final)
        : "";
    document.getElementById("rAtivo").value = String(recorrencia?.ativo ?? true);

    document
        .getElementById("formRecorrencia")
        .addEventListener("submit", async evento => {
            evento.preventDefault();

            const objeto = {
                natureza: document.getElementById("rNatureza").value,
                tipo: document.getElementById("rTipo").value,
                categoria_id: document.getElementById("rCategoria").value || null,
                cartao_id: document.getElementById("rCartao").value || null,
                descricao: document.getElementById("rDescricao").value.trim(),
                valor: Number(document.getElementById("rValor").value || 0),
                dia_vencimento: Number(document.getElementById("rDia").value || 1),
                competencia_inicial: competenciaParaData(
                    document.getElementById("rInicio").value
                ),
                competencia_final: document.getElementById("rFim").value
                    ? competenciaParaData(document.getElementById("rFim").value)
                    : null,
                ativo: document.getElementById("rAtivo").value === "true"
            };

            try {
                if (recorrencia) {
                    await atualizarRecorrencia(recorrencia.id, objeto);
                } else {
                    await inserirRecorrencia(objeto);
                }

                fecharModal();
                await paginaRecorrencias();
            } catch (erro) {
                console.error(erro);
                alert(`Não foi possível salvar a recorrência: ${erro.message}`);
            }
        });

    document
        .getElementById("btnExcluirRecorrencia")
        ?.addEventListener("click", async () => {
            const confirmar = confirm(
                "Excluir esta recorrência? Os lançamentos já confirmados serão mantidos no histórico."
            );

            if (!confirmar) {
                return;
            }

            const botao = document.getElementById("btnExcluirRecorrencia");
            botao.disabled = true;
            botao.textContent = "Excluindo...";

            try {
                await excluirRecorrencia(recorrencia.id);

                /* Remove imediatamente do estado local para não permanecer na tela. */
                estado.recorrencias = estado.recorrencias.filter(
                    item => Number(item.id) !== Number(recorrencia.id)
                );

                fecharModal();
                await paginaRecorrencias();
            } catch (erro) {
                console.error(erro);
                botao.disabled = false;
                botao.textContent = "Excluir";
                alert(`Não foi possível excluir a recorrência: ${erro.message}`);
            }
        });
}

async function paginaRecorrencias() {
    setTitulo(
        "Recorrências",
        "Contas e receitas fixas ou variáveis"
    );

    setAcaoPrincipal(
        "+ Nova recorrência",
        () => abrirModalRecorrencia()
    );

    [
        estado.categorias,
        estado.cartoes,
        estado.recorrencias
    ] = await Promise.all([
        buscarCategorias(),
        buscarCartoes(),
        buscarRecorrencias()
    ]);

    document.getElementById("app").innerHTML = `
        <section class="panel">
            <div class="panel-header">
                <div>
                    <h2>Recorrências</h2>
                    <p>${estado.recorrencias.length} registro(s)</p>
                </div>
            </div>

            ${estado.recorrencias.length ? `
                <div style="overflow:auto">
                    <table class="list-table">
                        <thead>
                            <tr>
                                <th>Dia</th>
                                <th>Natureza</th>
                                <th>Tipo</th>
                                <th>Categoria</th>
                                <th>Descrição</th>
                                <th>Cartão</th>
                                <th>Valor</th>
                                <th>Início</th>
                                <th>Fim</th>
                                <th>Ativa</th>
                                <th>Ações</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${estado.recorrencias.map(item => `
                                <tr>
                                    <td>${item.dia_vencimento}</td>
                                    <td>${item.natureza === "entrada" ? "Entrada" : "Saída"}</td>
                                    <td>${item.tipo === "fixo" ? "Fixo" : "Variável"}</td>
                                    <td>${escapeHtml(item.categorias?.nome || "-")}</td>
                                    <td>${escapeHtml(item.descricao)}</td>
                                    <td>${escapeHtml(item.cartoes?.nome || "-")}</td>
                                    <td>${moeda(item.valor)}</td>
                                    <td>${nomeMes(chaveMes(item.competencia_inicial))}</td>
                                    <td>${item.competencia_final
                                        ? nomeMes(chaveMes(item.competencia_final))
                                        : "-"}</td>
                                    <td>${item.ativo ? "Sim" : "Não"}</td>
                                    <td>
                                        <button
                                            class="mini-btn edit"
                                            onclick="abrirModalRecorrencia(${item.id})"
                                        >
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            ` : `
                <p class="msg">Nenhuma recorrência cadastrada.</p>
            `}
        </section>
    `;
}
