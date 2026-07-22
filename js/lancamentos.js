function opcoesCategoria() {
    return estado.categorias
        .filter(item => item.ativo !== false)
        .map(item => `
            <option value="${item.id}">
                ${escapeHtml(item.nome)}
            </option>
        `)
        .join("");
}

function opcoesCartao() {
    return estado.cartoes
        .filter(item => item.ativo !== false)
        .map(item => `
            <option value="${item.id}">
                ${escapeHtml(item.nome)}
            </option>
        `)
        .join("");
}

function abrirOcorrenciaRecorrente(
    recorrenciaId,
    competencia
) {
    const recorrencia =
        estado.recorrencias.find(
            item =>
                item.id === recorrenciaId
        );

    if (!recorrencia) {
        return;
    }

    abrirModalLancamentoDetalhado(
        null,
        {
            natureza:
                recorrencia.natureza,

            tipo:
                recorrencia.tipo,

            categoria_id:
                recorrencia.categoria_id,

            cartao_id:
                recorrencia.cartao_id,

            recorrencia_id:
                recorrencia.id,

            descricao:
                recorrencia.descricao,

            competencia:
                `${competencia}-01`,

            vencimento:
                montarDataRecorrencia(
                    competencia,
                    recorrencia.dia_vencimento
                ),

            valor_previsto:
                Number(
                    recorrencia.valor || 0
                ),

            status: "pendente",

            observacao:
                "Lançamento gerado por recorrência"
        }
    );
}

function obterFormaPagamento(item = null) {
    if (!item?.cartao_id) {
        return "visa_itau";
    }

    const cartao = estado.cartoes.find(
        atual => String(atual.id) === String(item.cartao_id)
    );

    const nome = (cartao?.nome || "").toLowerCase();

    if (nome.includes("itaú") || nome.includes("itau")) {
        return "visa_itau";
    }

    if (nome.includes("nubank")) {
        return "nubank";
    }

    return "pix";
}


function obterCartaoIdPorForma(forma) {
    if (forma === "pix") {
        return null;
    }

    const termos = forma === "visa_itau"
        ? ["itaú", "itau"]
        : ["nubank"];

    const cartao = estado.cartoes.find(item => {
        const nome = (item.nome || "").toLowerCase();
        return termos.some(termo => nome.includes(termo));
    });

    return cartao?.id || null;
}

function somarMesesData(dataIso, quantidade) {
    const [ano, mes, dia] = dataIso.split("-").map(Number);
    const data = new Date(ano, mes - 1 + quantidade, 1);
    const ultimoDia = new Date(
        data.getFullYear(),
        data.getMonth() + 1,
        0
    ).getDate();

    data.setDate(Math.min(dia, ultimoDia));

    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function dataHojeLocal() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

function abrirModalLancamento(id = null) {
    const itemEditado = id
        ? estado.lancamentos.find(item => item.id === id)
        : null;

    const formaAtual = obterFormaPagamento(itemEditado);
    const dataAtual = itemEditado?.data_realizacao
        || itemEditado?.vencimento
        || dataHojeLocal();
    const valorAtual = itemEditado?.valor_realizado
        ?? itemEditado?.valor_previsto
        ?? "";
    const parcelasAtuais = itemEditado?.total_parcelas || 1;

    abrirModal(
        itemEditado ? "Editar lançamento" : "Novo lançamento",
        `
            <form id="formLancamentoRapido" class="form-grid launch-quick-form">
                <fieldset class="choice-field span-2">
                    <legend>Natureza</legend>
                    <div class="choice-buttons two-options">
                        <label class="choice-button">
                            <input type="radio" name="naturezaRapida" value="saida" ${!itemEditado || itemEditado.natureza === "saida" ? "checked" : ""}>
                            <span>Saída</span>
                        </label>
                        <label class="choice-button">
                            <input type="radio" name="naturezaRapida" value="entrada" ${itemEditado?.natureza === "entrada" ? "checked" : ""}>
                            <span>Entrada</span>
                        </label>
                    </div>
                </fieldset>

                <label class="span-2">
                    Categoria
                    <select id="categoriaIdRapida" required>
                        <option value="">Selecione uma categoria</option>
                        ${opcoesCategoria()}
                    </select>
                </label>

                <fieldset class="choice-field span-2">
                    <legend>Forma de pagamento</legend>
                    <div class="choice-buttons payment-options">
                        <label class="choice-button">
                            <input type="radio" name="formaPagamento" value="visa_itau" ${formaAtual === "visa_itau" ? "checked" : ""}>
                            <span>💳 Visa Itaú</span>
                        </label>
                        <label class="choice-button">
                            <input type="radio" name="formaPagamento" value="nubank" ${formaAtual === "nubank" ? "checked" : ""}>
                            <span>💳 Nubank</span>
                        </label>
                        <label class="choice-button">
                            <input type="radio" name="formaPagamento" value="pix" ${formaAtual === "pix" ? "checked" : ""}>
                            <span>📱 PIX</span>
                        </label>
                    </div>
                </fieldset>

                <label>
                    Data
                    <input id="dataLancamentoRapida" type="date" value="${dataAtual}" required>
                </label>

                <label>
                    Valor
                    <input id="valorLancamentoRapida" type="number" min="0.01" step="0.01" value="${valorAtual}" required>
                </label>

                <label class="span-2">
                    Parcelas <small>(opcional)</small>
                    <input id="parcelasLancamentoRapida" type="number" min="1" step="1" value="${parcelasAtuais}">
                </label>

                <div class="form-actions span-2">
                    ${itemEditado ? `
                        <button id="btnExcluirLancamento" class="btn danger" type="button">Excluir</button>
                    ` : ""}
                    <div class="spacer"></div>
                    <button class="btn secondary" type="button" onclick="fecharModal()">Cancelar</button>
                    <button class="btn primary" type="submit">Salvar</button>
                </div>
            </form>
        `
    );

    document.getElementById("categoriaIdRapida").value =
        itemEditado?.categoria_id || "";

    document.getElementById("formLancamentoRapido").addEventListener(
        "submit",
        async evento => {
            evento.preventDefault();

            const natureza = document.querySelector(
                'input[name="naturezaRapida"]:checked'
            ).value;
            const formaPagamento = document.querySelector(
                'input[name="formaPagamento"]:checked'
            ).value;
            const categoriaId = document.getElementById("categoriaIdRapida").value;
            const categoria = estado.categorias.find(
                atual => String(atual.id) === String(categoriaId)
            );
            const data = document.getElementById("dataLancamentoRapida").value;
            const valorTotal = Number(
                document.getElementById("valorLancamentoRapida").value || 0
            );
            const totalParcelas = Math.max(
                1,
                Number(document.getElementById("parcelasLancamentoRapida").value || 1)
            );

            if (!categoriaId || !data || valorTotal <= 0) {
                alert("Preencha categoria, data e valor.");
                return;
            }

            const valorParcela = Number((valorTotal / totalParcelas).toFixed(2));
            const diferenca = Number((valorTotal - valorParcela * totalParcelas).toFixed(2));
            const cartaoId = obterCartaoIdPorForma(formaPagamento);
            const descricaoBase = categoria?.nome || (natureza === "saida" ? "Saída" : "Entrada");

            if (itemEditado) {
                const objeto = {
                    natureza,
                    tipo: itemEditado.tipo || "variavel",
                    categoria_id: categoriaId,
                    cartao_id: cartaoId,
                    recorrencia_id: itemEditado.recorrencia_id || null,
                    descricao: totalParcelas > 1
                        ? `${descricaoBase} (${itemEditado.parcela_atual || 1}/${totalParcelas})`
                        : descricaoBase,
                    competencia: competenciaParaData(data.slice(0, 7)),
                    vencimento: data,
                    valor_previsto: valorTotal,
                    valor_realizado: valorTotal,
                    status: natureza === "saida" ? "pago" : "recebido",
                    data_realizacao: data,
                    parcela_atual: totalParcelas > 1 ? (itemEditado.parcela_atual || 1) : null,
                    total_parcelas: totalParcelas > 1 ? totalParcelas : null,
                    observacao: itemEditado.observacao || null
                };

                await atualizarLancamento(itemEditado.id, objeto);
            } else {
                for (let indice = 0; indice < totalParcelas; indice += 1) {
                    const dataParcela = somarMesesData(data, indice);
                    const valor = indice === totalParcelas - 1
                        ? Number((valorParcela + diferenca).toFixed(2))
                        : valorParcela;

                    await inserirLancamento({
                        natureza,
                        tipo: "variavel",
                        categoria_id: categoriaId,
                        cartao_id: cartaoId,
                        recorrencia_id: null,
                        descricao: totalParcelas > 1
                            ? `${descricaoBase} (${indice + 1}/${totalParcelas})`
                            : descricaoBase,
                        competencia: competenciaParaData(dataParcela.slice(0, 7)),
                        vencimento: dataParcela,
                        valor_previsto: valor,
                        valor_realizado: valor,
                        status: natureza === "saida" ? "pago" : "recebido",
                        data_realizacao: dataParcela,
                        parcela_atual: totalParcelas > 1 ? indice + 1 : null,
                        total_parcelas: totalParcelas > 1 ? totalParcelas : null,
                        observacao: null
                    });
                }
            }

            fecharModal();
            await navegar(paginaAtual);
        }
    );

    document.getElementById("btnExcluirLancamento")?.addEventListener(
        "click",
        async () => {
            if (!confirm("Excluir este lançamento?")) {
                return;
            }

            await excluirLancamento(itemEditado.id);
            fecharModal();
            await navegar(paginaAtual);
        }
    );
}

function abrirModalLancamentoDetalhado(
    id = null,
    dadosIniciais = null
) {
    const itemEditado = id
        ? estado.lancamentos.find(
            item => item.id === id
        )
        : null;

    const item =
        itemEditado ||
        dadosIniciais ||
        null;

    abrirModal(
        itemEditado
            ? "Editar lançamento"
            : dadosIniciais
                ? "Confirmar recorrência"
                : "Novo lançamento",

        `
            <form
                id="formLancamento"
                class="form-grid"
            >
                <label>
                    Natureza

                    <select id="natureza">
                        <option value="saida">
                            Saída
                        </option>

                        <option value="entrada">
                            Entrada
                        </option>
                    </select>
                </label>

                <label>
                    Tipo

                    <select id="tipo">
                        <option value="fixo">
                            Fixo
                        </option>

                        <option value="variavel">
                            Variável
                        </option>
                    </select>
                </label>

                <label>
                    Categoria

                    <select id="categoriaId">
                        <option value="">
                            Sem categoria
                        </option>

                        ${opcoesCategoria()}
                    </select>
                </label>

                <label>
                    Cartão

                    <select id="cartaoId">
                        <option value="">
                            Sem cartão
                        </option>

                        ${opcoesCartao()}
                    </select>
                </label>

                <label class="span-2">
                    Descrição

                    <input
                        id="descricao"
                        required
                    >
                </label>

                <label>
                    Competência

                    <input
                        id="competencia"
                        type="month"
                        required
                    >
                </label>

                <label>
                    Vencimento

                    <input
                        id="vencimento"
                        type="date"
                    >
                </label>

                <label>
                    Valor previsto

                    <input
                        id="valorPrevisto"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                    >
                </label>

                <label>
                    Status

                    <select id="status">
                        <option value="pendente">
                            Pendente
                        </option>

                        <option value="pago">
                            Pago
                        </option>

                        <option value="recebido">
                            Recebido
                        </option>

                        <option value="cancelado">
                            Cancelado
                        </option>
                    </select>
                </label>

                <label>
                    Valor realizado

                    <input
                        id="valorRealizado"
                        type="number"
                        min="0"
                        step="0.01"
                    >
                </label>

                <label>
                    Data da realização

                    <input
                        id="dataRealizacao"
                        type="date"
                    >
                </label>

                <label>
                    Parcela atual

                    <input
                        id="parcelaAtual"
                        type="number"
                        min="1"
                    >
                </label>

                <label>
                    Total de parcelas

                    <input
                        id="totalParcelas"
                        type="number"
                        min="1"
                    >
                </label>

                <label class="span-2">
                    Observação

                    <textarea
                        id="observacao"
                        rows="3"
                    ></textarea>
                </label>

                <div
                    class="form-actions span-2"
                >
                    ${
                        itemEditado
                            ? `
                                <button
                                    id="btnExcluirLancamento"
                                    class="btn danger"
                                    type="button"
                                >
                                    Excluir
                                </button>
                            `
                            : ""
                    }

                    <div class="spacer"></div>

                    <button
                        class="btn secondary"
                        type="button"
                        onclick="fecharModal()"
                    >
                        Cancelar
                    </button>

                    <button
                        class="btn primary"
                        type="submit"
                    >
                        Salvar
                    </button>
                </div>
            </form>
        `
    );

    document.getElementById("natureza").value =
        item?.natureza || "saida";

    document.getElementById("tipo").value =
        item?.tipo || "fixo";

    document.getElementById("categoriaId").value =
        item?.categoria_id || "";

    document.getElementById("cartaoId").value =
        item?.cartao_id || "";

    document.getElementById("descricao").value =
        item?.descricao || "";

    document.getElementById("competencia").value =
        item?.competencia
            ? chaveMes(item.competencia)
            : competenciaAtual();

    document.getElementById("vencimento").value =
        item?.vencimento || "";

    document.getElementById("valorPrevisto").value =
        item?.valor_previsto ?? "";

    document.getElementById("status").value =
        item?.status || "pendente";

    document.getElementById("valorRealizado").value =
        item?.valor_realizado ?? "";

    document.getElementById("dataRealizacao").value =
        item?.data_realizacao || "";

    document.getElementById("parcelaAtual").value =
        item?.parcela_atual ?? "";

    document.getElementById("totalParcelas").value =
        item?.total_parcelas ?? "";

    document.getElementById("observacao").value =
        item?.observacao || "";

    document
        .getElementById("formLancamento")
        .addEventListener(
            "submit",
            async evento => {
                evento.preventDefault();

                const valorRealizado =
                    document
                        .getElementById(
                            "valorRealizado"
                        )
                        .value;

                const objeto = {
                    natureza:
                        document
                            .getElementById(
                                "natureza"
                            )
                            .value,

                    tipo:
                        document
                            .getElementById(
                                "tipo"
                            )
                            .value,

                    categoria_id:
                        document
                            .getElementById(
                                "categoriaId"
                            )
                            .value ||
                        null,

                    cartao_id:
                        document
                            .getElementById(
                                "cartaoId"
                            )
                            .value ||
                        null,

                    recorrencia_id:
                        item?.recorrencia_id ||
                        null,

                    descricao:
                        document
                            .getElementById(
                                "descricao"
                            )
                            .value
                            .trim(),

                    competencia:
                        competenciaParaData(
                            document
                                .getElementById(
                                    "competencia"
                                )
                                .value
                        ),

                    vencimento:
                        document
                            .getElementById(
                                "vencimento"
                            )
                            .value ||
                        null,

                    valor_previsto:
                        Number(
                            document
                                .getElementById(
                                    "valorPrevisto"
                                )
                                .value ||
                            0
                        ),

                    valor_realizado:
                        valorRealizado
                            ? Number(
                                valorRealizado
                            )
                            : null,

                    status:
                        document
                            .getElementById(
                                "status"
                            )
                            .value,

                    data_realizacao:
                        document
                            .getElementById(
                                "dataRealizacao"
                            )
                            .value ||
                        null,

                    parcela_atual:
                        document
                            .getElementById(
                                "parcelaAtual"
                            )
                            .value
                            ? Number(
                                document
                                    .getElementById(
                                        "parcelaAtual"
                                    )
                                    .value
                            )
                            : null,

                    total_parcelas:
                        document
                            .getElementById(
                                "totalParcelas"
                            )
                            .value
                            ? Number(
                                document
                                    .getElementById(
                                        "totalParcelas"
                                    )
                                    .value
                            )
                            : null,

                    observacao:
                        document
                            .getElementById(
                                "observacao"
                            )
                            .value
                            .trim() ||
                        null
                };

                if (itemEditado) {
                    await atualizarLancamento(
                        itemEditado.id,
                        objeto
                    );
                } else {
                    await inserirLancamento(
                        objeto
                    );
                }

                fecharModal();

                await navegar(
                    paginaAtual
                );
            }
        );

    document
        .getElementById(
            "btnExcluirLancamento"
        )
        ?.addEventListener(
            "click",
            async () => {
                if (
                    !confirm(
                        "Excluir este lançamento?"
                    )
                ) {
                    return;
                }

                await excluirLancamento(
                    itemEditado.id
                );

                fecharModal();

                await navegar(
                    paginaAtual
                );
            }
        );
}

async function paginaLancamentos() {
    setTitulo(
        "Lançamentos",
        "Todos os registros previstos e realizados"
    );

    setAcaoPrincipal(
        "+ Novo lançamento",
        () => abrirModalLancamento()
    );

    estado.meses =
        mesesAPartirDoAtual(24);

    [
        estado.categorias,
        estado.cartoes,
        estado.lancamentos
    ] = await Promise.all([
        buscarCategorias(),
        buscarCartoes(),
        buscarLancamentos(
            estado.meses
        )
    ]);

    document
        .getElementById("app")
        .innerHTML = `
            <section class="panel">
                <div class="panel-header">
                    <div>
                        <h2>Lançamentos</h2>

                        <p>
                            ${estado.lancamentos.length}
                            registro(s)
                        </p>
                    </div>
                </div>

                ${
                    estado.lancamentos.length
                        ? `
                            <div style="overflow:auto">
                                <table class="list-table">
                                    <thead>
                                        <tr>
                                            <th>Competência</th>
                                            <th>Vencimento</th>
                                            <th>Natureza</th>
                                            <th>Tipo</th>
                                            <th>Categoria</th>
                                            <th>Descrição</th>
                                            <th>Cartão</th>
                                            <th>Previsto</th>
                                            <th>Realizado</th>
                                            <th>Status</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        ${estado.lancamentos
                                            .map(item => `
                                                <tr>
                                                    <td>
                                                        ${nomeMes(
                                                            chaveMes(
                                                                item.competencia
                                                            )
                                                        )}
                                                    </td>

                                                    <td>
                                                        ${item.vencimento || "-"}
                                                    </td>

                                                    <td>
                                                        ${item.natureza}
                                                    </td>

                                                    <td>
                                                        ${item.tipo}
                                                    </td>

                                                    <td>
                                                        ${escapeHtml(
                                                            item.categorias?.nome ||
                                                            "-"
                                                        )}
                                                    </td>

                                                    <td>
                                                        ${escapeHtml(
                                                            item.descricao
                                                        )}
                                                    </td>

                                                    <td>
                                                        ${escapeHtml(
                                                            item.cartoes?.nome ||
                                                            "-"
                                                        )}
                                                    </td>

                                                    <td>
                                                        ${moeda(
                                                            item.valor_previsto
                                                        )}
                                                    </td>

                                                    <td>
                                                        ${
                                                            item.valor_realizado ==
                                                            null
                                                                ? "-"
                                                                : moeda(
                                                                    item.valor_realizado
                                                                )
                                                        }
                                                    </td>

                                                    <td>
                                                        ${normalizarStatus(
                                                            item
                                                        )}
                                                    </td>

                                                    <td>
                                                        <button
                                                            class="mini-btn edit"
                                                            onclick="abrirModalLancamento(${item.id})"
                                                        >
                                                            Editar
                                                        </button>
                                                    </td>
                                                </tr>
                                            `)
                                            .join("")}
                                    </tbody>
                                </table>
                            </div>
                        `
                        : `
                            <p class="msg">
                                Nenhum lançamento cadastrado.
                            </p>
                        `
                }
            </section>
        `;
}
